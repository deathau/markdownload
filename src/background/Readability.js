function Readability(doc, options) {
	if (options && options.documentElement) {
		doc = options;
		options = arguments[2];
	} else if (!doc || !doc.documentElement) {
		throw new Error("First argument to Readability constructor should be a document object.");
	}
	options = options || {};

	this._doc = doc;
	this._docJSDOMParser = this._doc.firstChild.__JSDOMParser__;
	this._articleTitle = null;
	this._articleByline = null;
	this._articleDir = null;
	this._articleSiteName = null;
	this._attempts = [];

	this._debug = !!options.debug;
	this._maxElemsToParse = options.maxElemsToParse || this.DEFAULT_MAX_ELEMS_TO_PARSE;
	this._nbTopCandidates = options.nbTopCandidates || this.DEFAULT_N_TOP_CANDIDATES;
	this._charThreshold = options.charThreshold || this.DEFAULT_CHAR_THRESHOLD;
	this._classesToPreserve = this.CLASSES_TO_PRESERVE.concat(options.classesToPreserve || []);
	this._keepClasses = !!options.keepClasses;
	this._serializer =
		options.serializer ||
		function (el) {
			return el.innerHTML;
		};
	this._disableJSONLD = !!options.disableJSONLD;

	this._flags = this.FLAG_STRIP_UNLIKELYS | this.FLAG_WEIGHT_CLASSES | this.FLAG_CLEAN_CONDITIONALLY;

	if (this._debug) {
		let logNode = function (node) {
			if (node.nodeType == node.TEXT_NODE) {
				return `${node.nodeName} ("${node.textContent}")`;
			}
			let attrPairs = Array.from(node.attributes || [], function (attr) {
				return `${attr.name}="${attr.value}"`;
			}).join(" ");
			return `<${node.localName} ${attrPairs}>`;
		};
		this.log = function () {
			if (typeof dump !== "undefined") {
				var msg = Array.prototype.map
					.call(arguments, function (x) {
						return x && x.nodeName ? logNode(x) : x;
					})
					.join(" ");
				dump("Reader: (Readability) " + msg + "\n");
			} else if (typeof console !== "undefined") {
				let args = Array.from(arguments, (arg) => {
					if (arg && arg.nodeType == this.ELEMENT_NODE) {
						return logNode(arg);
					}
					return arg;
				});
				args.unshift("Reader: (Readability)");
				console.log.apply(console, args);
			}
		};
	} else {
		this.log = function () {};
	}
}
Readability.prototype = {
	FLAG_STRIP_UNLIKELYS: 0x1,
	FLAG_WEIGHT_CLASSES: 0x2,
	FLAG_CLEAN_CONDITIONALLY: 0x4,

	ELEMENT_NODE: 1,
	TEXT_NODE: 3,

	DEFAULT_MAX_ELEMS_TO_PARSE: 0,

	DEFAULT_N_TOP_CANDIDATES: 5,

	DEFAULT_TAGS_TO_SCORE: "section,h2,h3,h4,h5,h6,p,td,pre".toUpperCase().split(","),

	DEFAULT_CHAR_THRESHOLD: 500,

	REGEXPS: {
		unlikelyCandidates:
			/-ad-|ai2html|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|footer|gdpr|header|legends|menu|related|remark|replies|rss|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|ad-break|agegate|pagination|pager|popup|yom-remote/i,
		okMaybeItsACandidate: /and|article|body|column|content|main|shadow/i,

		positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
		negative:
			/-ad-|hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|foot|footer|footnote|gdpr|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget/i,
		extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
		byline: /author|byline|dateline|writtenby|p-author/i,
		replaceFonts: /<(\/?)font[^>]*>/gi,
		normalize: /\s{2,}/g,
		videos:
			/\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
		shareElements: /(\b|_)(share|sharedaddy)(\b|_)/i,
		nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
		prevLink: /(prev|earl|old|new|<|«)/i,
		tokenize: /\W+/g,
		whitespace: /^\s*$/,
		hasContent: /\S$/,
		hashUrl: /^#.+/,
		srcsetUrl: /(\S+)(\s+[\d.]+[xw])?(\s*(?:,|$))/g,
		b64DataUrl: /^data:\s*([^\s;,]+)\s*;\s*base64\s*,/i,
		jsonLdArticleTypes:
			/^Article|AdvertiserContentArticle|NewsArticle|AnalysisNewsArticle|AskPublicNewsArticle|BackgroundNewsArticle|OpinionNewsArticle|ReportageNewsArticle|ReviewNewsArticle|Report|SatiricalArticle|ScholarlyArticle|MedicalScholarlyArticle|SocialMediaPosting|BlogPosting|LiveBlogPosting|DiscussionForumPosting|TechArticle|APIReference$/,
	},

	UNLIKELY_ROLES: ["menu", "menubar", "complementary", "navigation", "alert", "alertdialog", "dialog"],

	DIV_TO_P_ELEMS: new Set(["BLOCKQUOTE", "DL", "DIV", "IMG", "OL", "P", "PRE", "TABLE", "UL"]),

	ALTER_TO_DIV_EXCEPTIONS: ["DIV", "ARTICLE", "SECTION", "P"],

	PRESENTATIONAL_ATTRIBUTES: [
		"align",
		"background",
		"bgcolor",
		"border",
		"cellpadding",
		"cellspacing",
		"frame",
		"hspace",
		"rules",
		"style",
		"valign",
		"vspace",
	],

	DEPRECATED_SIZE_ATTRIBUTE_ELEMS: ["TABLE", "TH", "TD", "HR", "PRE"],

	PHRASING_ELEMS: [
		"ABBR",
		"AUDIO",
		"B",
		"BDO",
		"BR",
		"BUTTON",
		"CITE",
		"CODE",
		"DATA",
		"DATALIST",
		"DFN",
		"EM",
		"EMBED",
		"I",
		"IMG",
		"INPUT",
		"KBD",
		"LABEL",
		"MARK",
		"MATH",
		"METER",
		"NOSCRIPT",
		"OBJECT",
		"OUTPUT",
		"PROGRESS",
		"Q",
		"RUBY",
		"SAMP",
		"SCRIPT",
		"SELECT",
		"SMALL",
		"SPAN",
		"STRONG",
		"SUB",
		"SUP",
		"TEXTAREA",
		"TIME",
		"VAR",
		"WBR",
	],

	CLASSES_TO_PRESERVE: ["page"],

	HTML_ESCAPE_MAP: {
		lt: "<",
		gt: ">",
		amp: "&",
		quot: '"',
		apos: "'",
	},

	_postProcessContent: function (articleContent) {
		this._fixRelativeUris(articleContent);

		this._simplifyNestedElements(articleContent);

		if (!this._keepClasses) {
			this._cleanClasses(articleContent);
		}
	},

	_removeNodes: function (nodeList, filterFn) {
		if (this._docJSDOMParser && nodeList._isLiveNodeList) {
			throw new Error("Do not pass live node lists to _removeNodes");
		}
		for (var i = nodeList.length - 1; i >= 0; i--) {
			var node = nodeList[i];
			var parentNode = node.parentNode;
			if (parentNode) {
				if (!filterFn || filterFn.call(this, node, i, nodeList)) {
					parentNode.removeChild(node);
				}
			}
		}
	},

	_replaceNodeTags: function (nodeList, newTagName) {
		if (this._docJSDOMParser && nodeList._isLiveNodeList) {
			throw new Error("Do not pass live node lists to _replaceNodeTags");
		}
		for (const node of nodeList) {
			this._setNodeTag(node, newTagName);
		}
	},

	_forEachNode: function (nodeList, fn) {
		Array.prototype.forEach.call(nodeList, fn, this);
	},

	_findNode: function (nodeList, fn) {
		return Array.prototype.find.call(nodeList, fn, this);
	},

	_someNode: function (nodeList, fn) {
		return Array.prototype.some.call(nodeList, fn, this);
	},

	_everyNode: function (nodeList, fn) {
		return Array.prototype.every.call(nodeList, fn, this);
	},

	_concatNodeLists: function () {
		var slice = Array.prototype.slice;
		var args = slice.call(arguments);
		var nodeLists = args.map(function (list) {
			return slice.call(list);
		});
		return Array.prototype.concat.apply([], nodeLists);
	},

	_getAllNodesWithTag: function (node, tagNames) {
		if (node.querySelectorAll) {
			return node.querySelectorAll(tagNames.join(","));
		}
		return [].concat.apply(
			[],
			tagNames.map(function (tag) {
				var collection = node.getElementsByTagName(tag);
				return Array.isArray(collection) ? collection : Array.from(collection);
			})
		);
	},

	_cleanClasses: function (node) {
		var classesToPreserve = this._classesToPreserve;
		var className = (node.getAttribute("class") || "")
			.split(/\s+/)
			.filter(function (cls) {
				return classesToPreserve.indexOf(cls) != -1;
			})
			.join(" ");

		if (className) {
			node.setAttribute("class", className);
		} else {
			node.removeAttribute("class");
		}

		for (node = node.firstElementChild; node; node = node.nextElementSibling) {
			this._cleanClasses(node);
		}
	},

	_fixRelativeUris: function (articleContent) {
		var baseURI = this._doc.baseURI;
		var documentURI = this._doc.documentURI;
		function toAbsoluteURI(uri) {
			if (baseURI == documentURI && uri.charAt(0) == "#") {
				return uri;
			}

			// console.log("toAbsoluteURI", uri, baseURI, documentURI);

			try {
				return new URL(uri, baseURI).href;
			} catch (ex) {}
			return uri;
		}

		var links = this._getAllNodesWithTag(articleContent, ["a"]);
		this._forEachNode(links, function (link) {
			var href = link.getAttribute("href");
			if (href) {
				if (href.indexOf("javascript:") === 0) {
					if (link.childNodes.length === 1 && link.childNodes[0].nodeType === this.TEXT_NODE) {
						var text = this._doc.createTextNode(link.textContent);
						link.parentNode.replaceChild(text, link);
					} else {
						var container = this._doc.createElement("span");
						while (link.firstChild) {
							container.appendChild(link.firstChild);
						}
						link.parentNode.replaceChild(container, link);
					}
				} else {
					link.setAttribute("href", toAbsoluteURI(href));
				}
			}
		});

		var medias = this._getAllNodesWithTag(articleContent, ["img", "picture", "figure", "video", "audio", "source"]);

		this._forEachNode(medias, function (media) {
			var src = media.getAttribute("src");
			var poster = media.getAttribute("poster");
			var srcset = media.getAttribute("srcset");

			if (src) {
				media.setAttribute("src", toAbsoluteURI(src));
			}

			if (poster) {
				media.setAttribute("poster", toAbsoluteURI(poster));
			}

			if (srcset) {
				var newSrcset = srcset.replace(this.REGEXPS.srcsetUrl, function (_, p1, p2, p3) {
					return toAbsoluteURI(p1) + (p2 || "") + p3;
				});

				media.setAttribute("srcset", newSrcset);
			}
		});
	},

	_simplifyNestedElements: function (articleContent) {
		var node = articleContent;

		while (node) {
			if (
				node.parentNode &&
				["DIV", "SECTION"].includes(node.tagName) &&
				!(node.id && node.id.startsWith("readability"))
			) {
				if (this._isElementWithoutContent(node)) {
					node = this._removeAndGetNext(node);
					continue;
				} else if (this._hasSingleTagInsideElement(node, "DIV") || this._hasSingleTagInsideElement(node, "SECTION")) {
					var child = node.children[0];
					for (var i = 0; i < node.attributes.length; i++) {
						child.setAttribute(node.attributes[i].name, node.attributes[i].value);
					}
					node.parentNode.replaceChild(child, node);
					node = child;
					continue;
				}
			}

			node = this._getNextNode(node);
		}
	},

	_getArticleTitle: function () {
		var doc = this._doc;
		var curTitle = "";
		var origTitle = "";

		try {
			curTitle = origTitle = doc.title.trim();

			if (typeof curTitle !== "string") curTitle = origTitle = this._getInnerText(doc.getElementsByTagName("title")[0]);
		} catch (e) {
			/* ignore exceptions setting the title. */
		}

		var titleHadHierarchicalSeparators = false;
		function wordCount(str) {
			return str.split(/\s+/).length;
		}

		if (/ [\|\-\\\/>»] /.test(curTitle)) {
			titleHadHierarchicalSeparators = / [\\\/>»] /.test(curTitle);
			curTitle = origTitle.replace(/(.*)[\|\-\\\/>»] .*/gi, "$1");

			if (wordCount(curTitle) < 3) curTitle = origTitle.replace(/[^\|\-\\\/>»]*[\|\-\\\/>»](.*)/gi, "$1");
		} else if (curTitle.indexOf(": ") !== -1) {
			var headings = this._concatNodeLists(doc.getElementsByTagName("h1"), doc.getElementsByTagName("h2"));
			var trimmedTitle = curTitle.trim();
			var match = this._someNode(headings, function (heading) {
				return heading.textContent.trim() === trimmedTitle;
			});

			if (!match) {
				curTitle = origTitle.substring(origTitle.lastIndexOf(":") + 1);

				if (wordCount(curTitle) < 3) {
					curTitle = origTitle.substring(origTitle.indexOf(":") + 1);
				} else if (wordCount(origTitle.substr(0, origTitle.indexOf(":"))) > 5) {
					curTitle = origTitle;
				}
			}
		} else if (curTitle.length > 150 || curTitle.length < 15) {
			var hOnes = doc.getElementsByTagName("h1");

			if (hOnes.length === 1) curTitle = this._getInnerText(hOnes[0]);
		}

		curTitle = curTitle.trim().replace(this.REGEXPS.normalize, " ");
		var curTitleWordCount = wordCount(curTitle);
		if (
			curTitleWordCount <= 4 &&
			(!titleHadHierarchicalSeparators || curTitleWordCount != wordCount(origTitle.replace(/[\|\-\\\/>»]+/g, "")) - 1)
		) {
			curTitle = origTitle;
		}
		console.log("curTitle", curTitle);

		return curTitle;
	},

	_prepDocument: function () {
		var doc = this._doc;

		this._removeNodes(this._getAllNodesWithTag(doc, ["style"]));

		if (doc.body) {
			this._replaceBrs(doc.body);
		}

		this._replaceNodeTags(this._getAllNodesWithTag(doc, ["font"]), "SPAN");
	},

	_nextNode: function (node) {
		var next = node;
		while (next && next.nodeType != this.ELEMENT_NODE && this.REGEXPS.whitespace.test(next.textContent)) {
			next = next.nextSibling;
		}
		return next;
	},

	_replaceBrs: function (elem) {
		this._forEachNode(this._getAllNodesWithTag(elem, ["br"]), function (br) {
			var next = br.nextSibling;

			var replaced = false;

			while ((next = this._nextNode(next)) && next.tagName == "BR") {
				replaced = true;
				var brSibling = next.nextSibling;
				next.parentNode.removeChild(next);
				next = brSibling;
			}

			if (replaced) {
				var p = this._doc.createElement("p");
				br.parentNode.replaceChild(p, br);

				next = p.nextSibling;
				while (next) {
					if (next.tagName == "BR") {
						var nextElem = this._nextNode(next.nextSibling);
						if (nextElem && nextElem.tagName == "BR") break;
					}

					if (!this._isPhrasingContent(next)) break;

					var sibling = next.nextSibling;
					p.appendChild(next);
					next = sibling;
				}

				while (p.lastChild && this._isWhitespace(p.lastChild)) {
					p.removeChild(p.lastChild);
				}

				if (p.parentNode.tagName === "P") this._setNodeTag(p.parentNode, "DIV");
			}
		});
	},

	_setNodeTag: function (node, tag) {
		this.log("_setNodeTag", node, tag);
		if (this._docJSDOMParser) {
			node.localName = tag.toLowerCase();
			node.tagName = tag.toUpperCase();
			return node;
		}

		var replacement = node.ownerDocument.createElement(tag);
		while (node.firstChild) {
			replacement.appendChild(node.firstChild);
		}
		node.parentNode.replaceChild(replacement, node);
		if (node.readability) replacement.readability = node.readability;

		for (var i = 0; i < node.attributes.length; i++) {
			try {
				replacement.setAttribute(node.attributes[i].name, node.attributes[i].value);
			} catch (ex) {}
		}
		return replacement;
	},

	_prepArticle: function (articleContent) {
		this._cleanStyles(articleContent);

		this._markDataTables(articleContent);

		this._fixLazyImages(articleContent);

		this._cleanConditionally(articleContent, "form");
		this._cleanConditionally(articleContent, "fieldset");
		this._clean(articleContent, "object");
		this._clean(articleContent, "embed");
		this._clean(articleContent, "footer");
		this._clean(articleContent, "link");
		this._clean(articleContent, "aside");

		var shareElementThreshold = this.DEFAULT_CHAR_THRESHOLD;

		this._forEachNode(articleContent.children, function (topCandidate) {
			this._cleanMatchedNodes(topCandidate, function (node, matchString) {
				return this.REGEXPS.shareElements.test(matchString) && node.textContent.length < shareElementThreshold;
			});
		});

		this._clean(articleContent, "iframe");
		this._clean(articleContent, "input");
		this._clean(articleContent, "textarea");
		this._clean(articleContent, "select");
		this._clean(articleContent, "button");
		this._cleanHeaders(articleContent);

		this._cleanConditionally(articleContent, "table");
		this._cleanConditionally(articleContent, "ul");
		this._cleanConditionally(articleContent, "div");

		this._replaceNodeTags(this._getAllNodesWithTag(articleContent, ["h1"]), "h2");

		this._removeNodes(this._getAllNodesWithTag(articleContent, ["p"]), function (paragraph) {
			var imgCount = paragraph.getElementsByTagName("img").length;
			var embedCount = paragraph.getElementsByTagName("embed").length;
			var objectCount = paragraph.getElementsByTagName("object").length;
			var iframeCount = paragraph.getElementsByTagName("iframe").length;
			var totalCount = imgCount + embedCount + objectCount + iframeCount;

			return totalCount === 0 && !this._getInnerText(paragraph, false);
		});

		this._forEachNode(this._getAllNodesWithTag(articleContent, ["br"]), function (br) {
			var next = this._nextNode(br.nextSibling);
			if (next && next.tagName == "P") br.parentNode.removeChild(br);
		});

		this._forEachNode(this._getAllNodesWithTag(articleContent, ["table"]), function (table) {
			var tbody = this._hasSingleTagInsideElement(table, "TBODY") ? table.firstElementChild : table;
			if (this._hasSingleTagInsideElement(tbody, "TR")) {
				var row = tbody.firstElementChild;
				if (this._hasSingleTagInsideElement(row, "TD")) {
					var cell = row.firstElementChild;
					cell = this._setNodeTag(cell, this._everyNode(cell.childNodes, this._isPhrasingContent) ? "P" : "DIV");
					table.parentNode.replaceChild(cell, table);
				}
			}
		});
	},

	_initializeNode: function (node) {
		node.readability = { contentScore: 0 };

		switch (node.tagName) {
			case "DIV":
				node.readability.contentScore += 5;
				break;

			case "PRE":
			case "TD":
			case "BLOCKQUOTE":
				node.readability.contentScore += 3;
				break;

			case "ADDRESS":
			case "OL":
			case "UL":
			case "DL":
			case "DD":
			case "DT":
			case "LI":
			case "FORM":
				node.readability.contentScore -= 3;
				break;

			case "H1":
			case "H2":
			case "H3":
			case "H4":
			case "H5":
			case "H6":
			case "TH":
				node.readability.contentScore -= 5;
				break;
		}

		node.readability.contentScore += this._getClassWeight(node);
	},

	_removeAndGetNext: function (node) {
		var nextNode = this._getNextNode(node, true);
		node.parentNode.removeChild(node);
		return nextNode;
	},

	_getNextNode: function (node, ignoreSelfAndKids) {
		if (!ignoreSelfAndKids && node.firstElementChild) {
			return node.firstElementChild;
		}
		if (node.nextElementSibling) {
			return node.nextElementSibling;
		}
		do {
			node = node.parentNode;
		} while (node && !node.nextElementSibling);
		return node && node.nextElementSibling;
	},

	_textSimilarity: function (textA, textB) {
		var tokensA = textA.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
		var tokensB = textB.toLowerCase().split(this.REGEXPS.tokenize).filter(Boolean);
		if (!tokensA.length || !tokensB.length) {
			return 0;
		}
		var uniqTokensB = tokensB.filter((token) => !tokensA.includes(token));
		var distanceB = uniqTokensB.join(" ").length / tokensB.join(" ").length;
		return 1 - distanceB;
	},

	_checkByline: function (node, matchString) {
		if (this._articleByline) {
			// console.log("checkByline1: ", this._articleByline);
			return false;
		}

		if (node.getAttribute !== undefined) {
			var rel = node.getAttribute("rel");
			var itemprop = node.getAttribute("itemprop");
		}

		// console.log("checkByline matchString: ", matchString);
		// console.log("checkByline this.REGEXPS.byline.test(matchString): ", this.REGEXPS.byline.test(matchString));

		if (
			(rel === "author" || (itemprop && itemprop.indexOf("author") !== -1) || this.REGEXPS.byline.test(matchString)) &&
			this._isValidByline(node.textContent)
		) {
			this._articleByline = node.textContent.trim();
			// console.log("checkByline2: ", this._articleByline);
			return true;
		}

		return false;
	},

	_getNodeAncestors: function (node, maxDepth) {
		maxDepth = maxDepth || 0;
		var i = 0,
			ancestors = [];
		while (node.parentNode) {
			ancestors.push(node.parentNode);
			if (maxDepth && ++i === maxDepth) break;
			node = node.parentNode;
		}
		return ancestors;
	},

	_grabArticle: function (page) {
		this.log("**** grabArticle ****");
		var doc = this._doc;
		var isPaging = page !== null;
		page = page ? page : this._doc.body;

		if (!page) {
			this.log("No body found in document. Abort.");
			return null;
		}

		var pageCacheHtml = page.innerHTML;

		while (true) {
			this.log("Starting grabArticle loop");
			var stripUnlikelyCandidates = this._flagIsActive(this.FLAG_STRIP_UNLIKELYS);

			var elementsToScore = [];
			var node = this._doc.documentElement;

			let shouldRemoveTitleHeader = true;

			while (node) {
				if (node.tagName === "HTML") {
					this._articleLang = node.getAttribute("lang");
				}

				var matchString = node.className + " " + node.id;

				if (!this._isProbablyVisible(node)) {
					this.log("Removing hidden node - " + matchString);
					node = this._removeAndGetNext(node);
					continue;
				}

				if (this._checkByline(node, matchString)) {
					node = this._removeAndGetNext(node);
					continue;
				}

				if (shouldRemoveTitleHeader && this._headerDuplicatesTitle(node)) {
					this.log("Removing header: ", node.textContent.trim(), this._articleTitle.trim());
					shouldRemoveTitleHeader = false;
					node = this._removeAndGetNext(node);
					continue;
				}

				if (stripUnlikelyCandidates) {
					if (
						this.REGEXPS.unlikelyCandidates.test(matchString) &&
						!this.REGEXPS.okMaybeItsACandidate.test(matchString) &&
						!this._hasAncestorTag(node, "table") &&
						!this._hasAncestorTag(node, "code") &&
						node.tagName !== "BODY" &&
						node.tagName !== "A"
					) {
						this.log("Removing unlikely candidate - " + matchString);
						node = this._removeAndGetNext(node);
						continue;
					}

					if (this.UNLIKELY_ROLES.includes(node.getAttribute("role"))) {
						this.log("Removing content with role " + node.getAttribute("role") + " - " + matchString);
						node = this._removeAndGetNext(node);
						continue;
					}
				}

				if (
					(node.tagName === "DIV" ||
						node.tagName === "SECTION" ||
						node.tagName === "HEADER" ||
						node.tagName === "H1" ||
						node.tagName === "H2" ||
						node.tagName === "H3" ||
						node.tagName === "H4" ||
						node.tagName === "H5" ||
						node.tagName === "H6") &&
					this._isElementWithoutContent(node)
				) {
					node = this._removeAndGetNext(node);
					continue;
				}

				if (this.DEFAULT_TAGS_TO_SCORE.indexOf(node.tagName) !== -1) {
					elementsToScore.push(node);
				}

				if (node.tagName === "DIV") {
					var p = null;
					var childNode = node.firstChild;
					while (childNode) {
						var nextSibling = childNode.nextSibling;
						if (this._isPhrasingContent(childNode)) {
							if (p !== null) {
								p.appendChild(childNode);
							} else if (!this._isWhitespace(childNode)) {
								p = doc.createElement("p");
								node.replaceChild(p, childNode);
								p.appendChild(childNode);
							}
						} else if (p !== null) {
							while (p.lastChild && this._isWhitespace(p.lastChild)) {
								p.removeChild(p.lastChild);
							}
							p = null;
						}
						childNode = nextSibling;
					}

					if (this._hasSingleTagInsideElement(node, "P") && this._getLinkDensity(node) < 0.25) {
						var newNode = node.children[0];
						node.parentNode.replaceChild(newNode, node);
						node = newNode;
						elementsToScore.push(node);
					} else if (!this._hasChildBlockElement(node)) {
						node = this._setNodeTag(node, "P");
						elementsToScore.push(node);
					}
				}
				node = this._getNextNode(node);
			}

			/**
			 * Loop through all paragraphs, and assign a score to them based on how content-y they look.
			 * Then add their score to their parent node.
			 *
			 * A score is determined by things like number of commas, class names, etc. Maybe eventually link density.
			 **/
			var candidates = [];
			this._forEachNode(elementsToScore, function (elementToScore) {
				if (!elementToScore.parentNode || typeof elementToScore.parentNode.tagName === "undefined") return;

				var innerText = this._getInnerText(elementToScore);
				if (innerText.length < 25) return;

				var ancestors = this._getNodeAncestors(elementToScore, 5);
				if (ancestors.length === 0) return;

				var contentScore = 0;

				contentScore += 1;

				contentScore += innerText.split(",").length;

				contentScore += Math.min(Math.floor(innerText.length / 100), 3);

				this._forEachNode(ancestors, function (ancestor, level) {
					if (!ancestor.tagName || !ancestor.parentNode || typeof ancestor.parentNode.tagName === "undefined") return;

					if (typeof ancestor.readability === "undefined") {
						this._initializeNode(ancestor);
						candidates.push(ancestor);
					}

					if (level === 0) var scoreDivider = 1;
					else if (level === 1) scoreDivider = 2;
					else scoreDivider = level * 3;
					ancestor.readability.contentScore += contentScore / scoreDivider;
				});
			});

			var topCandidates = [];
			for (var c = 0, cl = candidates.length; c < cl; c += 1) {
				var candidate = candidates[c];

				var candidateScore = candidate.readability.contentScore * (1 - this._getLinkDensity(candidate));
				candidate.readability.contentScore = candidateScore;

				this.log("Candidate:", candidate, "with score " + candidateScore);

				for (var t = 0; t < this._nbTopCandidates; t++) {
					var aTopCandidate = topCandidates[t];

					if (!aTopCandidate || candidateScore > aTopCandidate.readability.contentScore) {
						topCandidates.splice(t, 0, candidate);
						if (topCandidates.length > this._nbTopCandidates) topCandidates.pop();
						break;
					}
				}
			}

			var topCandidate = topCandidates[0] || null;
			var neededToCreateTopCandidate = false;
			var parentOfTopCandidate;

			if (topCandidate === null || topCandidate.tagName === "BODY") {
				topCandidate = doc.createElement("DIV");
				neededToCreateTopCandidate = true;
				while (page.firstChild) {
					this.log("Moving child out:", page.firstChild);
					topCandidate.appendChild(page.firstChild);
				}

				page.appendChild(topCandidate);

				this._initializeNode(topCandidate);
			} else if (topCandidate) {
				var alternativeCandidateAncestors = [];
				for (var i = 1; i < topCandidates.length; i++) {
					if (topCandidates[i].readability.contentScore / topCandidate.readability.contentScore >= 0.75) {
						alternativeCandidateAncestors.push(this._getNodeAncestors(topCandidates[i]));
					}
				}
				var MINIMUM_TOPCANDIDATES = 3;
				if (alternativeCandidateAncestors.length >= MINIMUM_TOPCANDIDATES) {
					parentOfTopCandidate = topCandidate.parentNode;
					while (parentOfTopCandidate.tagName !== "BODY") {
						var listsContainingThisAncestor = 0;
						for (
							var ancestorIndex = 0;
							ancestorIndex < alternativeCandidateAncestors.length &&
							listsContainingThisAncestor < MINIMUM_TOPCANDIDATES;
							ancestorIndex++
						) {
							listsContainingThisAncestor += Number(
								alternativeCandidateAncestors[ancestorIndex].includes(parentOfTopCandidate)
							);
						}
						if (listsContainingThisAncestor >= MINIMUM_TOPCANDIDATES) {
							topCandidate = parentOfTopCandidate;
							break;
						}
						parentOfTopCandidate = parentOfTopCandidate.parentNode;
					}
				}
				if (!topCandidate.readability) {
					this._initializeNode(topCandidate);
				}

				parentOfTopCandidate = topCandidate.parentNode;
				var lastScore = topCandidate.readability.contentScore;
				var scoreThreshold = lastScore / 3;
				while (parentOfTopCandidate.tagName !== "BODY") {
					if (!parentOfTopCandidate.readability) {
						parentOfTopCandidate = parentOfTopCandidate.parentNode;
						continue;
					}
					var parentScore = parentOfTopCandidate.readability.contentScore;
					if (parentScore < scoreThreshold) break;
					if (parentScore > lastScore) {
						topCandidate = parentOfTopCandidate;
						break;
					}
					lastScore = parentOfTopCandidate.readability.contentScore;
					parentOfTopCandidate = parentOfTopCandidate.parentNode;
				}

				parentOfTopCandidate = topCandidate.parentNode;
				while (parentOfTopCandidate.tagName != "BODY" && parentOfTopCandidate.children.length == 1) {
					topCandidate = parentOfTopCandidate;
					parentOfTopCandidate = topCandidate.parentNode;
				}
				if (!topCandidate.readability) {
					this._initializeNode(topCandidate);
				}
			}

			var articleContent = doc.createElement("DIV");
			if (isPaging) articleContent.id = "readability-content";

			var siblingScoreThreshold = Math.max(10, topCandidate.readability.contentScore * 0.2);
			parentOfTopCandidate = topCandidate.parentNode;
			var siblings = parentOfTopCandidate.children;

			for (var s = 0, sl = siblings.length; s < sl; s++) {
				var sibling = siblings[s];
				var append = false;

				this.log(
					"Looking at sibling node:",
					sibling,
					sibling.readability ? "with score " + sibling.readability.contentScore : ""
				);
				this.log("Sibling has score", sibling.readability ? sibling.readability.contentScore : "Unknown");

				if (sibling === topCandidate) {
					append = true;
				} else {
					var contentBonus = 0;

					if (sibling.className === topCandidate.className && topCandidate.className !== "")
						contentBonus += topCandidate.readability.contentScore * 0.2;

					if (sibling.readability && sibling.readability.contentScore + contentBonus >= siblingScoreThreshold) {
						append = true;
					} else if (sibling.nodeName === "P") {
						var linkDensity = this._getLinkDensity(sibling);
						var nodeContent = this._getInnerText(sibling);
						var nodeLength = nodeContent.length;

						if (nodeLength > 80 && linkDensity < 0.25) {
							append = true;
						} else if (nodeLength < 80 && nodeLength > 0 && linkDensity === 0 && nodeContent.search(/\.( |$)/) !== -1) {
							append = true;
						}
					}
				}

				if (append) {
					this.log("Appending node:", sibling);

					if (this.ALTER_TO_DIV_EXCEPTIONS.indexOf(sibling.nodeName) === -1) {
						this.log("Altering sibling:", sibling, "to div.");

						sibling = this._setNodeTag(sibling, "DIV");
					}

					articleContent.appendChild(sibling);
					siblings = parentOfTopCandidate.children;
					s -= 1;
					sl -= 1;
				}
			}

			if (this._debug) this.log("Article content pre-prep: " + articleContent.innerHTML);
			this._prepArticle(articleContent);
			if (this._debug) this.log("Article content post-prep: " + articleContent.innerHTML);

			if (neededToCreateTopCandidate) {
				topCandidate.id = "readability-page-1";
				topCandidate.className = "page";
			} else {
				var div = doc.createElement("DIV");
				div.id = "readability-page-1";
				div.className = "page";
				while (articleContent.firstChild) {
					div.appendChild(articleContent.firstChild);
				}
				articleContent.appendChild(div);
			}

			if (this._debug) this.log("Article content after paging: " + articleContent.innerHTML);

			var parseSuccessful = true;

			var textLength = this._getInnerText(articleContent, true).length;
			if (textLength < this._charThreshold) {
				parseSuccessful = false;
				page.innerHTML = pageCacheHtml;

				if (this._flagIsActive(this.FLAG_STRIP_UNLIKELYS)) {
					this._removeFlag(this.FLAG_STRIP_UNLIKELYS);
					this._attempts.push({ articleContent: articleContent, textLength: textLength });
				} else if (this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) {
					this._removeFlag(this.FLAG_WEIGHT_CLASSES);
					this._attempts.push({ articleContent: articleContent, textLength: textLength });
				} else if (this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) {
					this._removeFlag(this.FLAG_CLEAN_CONDITIONALLY);
					this._attempts.push({ articleContent: articleContent, textLength: textLength });
				} else {
					this._attempts.push({ articleContent: articleContent, textLength: textLength });
					this._attempts.sort(function (a, b) {
						return b.textLength - a.textLength;
					});

					if (!this._attempts[0].textLength) {
						return null;
					}

					articleContent = this._attempts[0].articleContent;
					parseSuccessful = true;
				}
			}

			if (parseSuccessful) {
				var ancestors = [parentOfTopCandidate, topCandidate].concat(this._getNodeAncestors(parentOfTopCandidate));
				this._someNode(ancestors, function (ancestor) {
					if (!ancestor.tagName) return false;
					var articleDir = ancestor.getAttribute("dir");
					if (articleDir) {
						this._articleDir = articleDir;
						return true;
					}
					return false;
				});
				return articleContent;
			}
		}
	},

	_isValidByline: function (byline) {
		if (typeof byline == "string" || byline instanceof String) {
			byline = byline.trim();
			// console.log("Checking valid byline:", byline);
			return byline.length > 0 && byline.length < 100;
		}
		return false;
	},

	_unescapeHtmlEntities: function (str) {
		if (!str) {
			return str;
		}

		var htmlEscapeMap = this.HTML_ESCAPE_MAP;
		return str
			.replace(/&(quot|amp|apos|lt|gt);/g, function (_, tag) {
				return htmlEscapeMap[tag];
			})
			.replace(/&#(?:x([0-9a-z]{1,4})|([0-9]{1,4}));/gi, function (_, hex, numStr) {
				var num = parseInt(hex || numStr, hex ? 16 : 10);
				return String.fromCharCode(num);
			});
	},

	_getByLineValueFromScript: function (doc) {
		var scripts = this._getAllNodesWithTag(doc, ["script"]);
		// console.log("Found " + scripts.length + " script tags in _getByLineValueFromScript function.");

		var metadata;

		this._forEachNode(scripts, function (scriptElement) {
			if (!metadata && scriptElement.getAttribute("type") === "text/javascript") {
				for (let i = 0; i < scripts.length; i++) {
					let scriptContent = scripts[i].textContent;
					// console.log("Inspecting script content:", scriptContent);
					if (scriptContent.includes("window.digitalData")) {
						metadata = {};
						try {
							// Extract the JSON object from the script content
							let jsonString = scriptContent.match(/window\.digitalData\s*=\s*({[\s\S]*?});/);
							if (jsonString && jsonString[1]) {
								// Parse the JSON object
								let digitalData = JSON.parse(jsonString[1]);

								// Extract the primary author
								if (digitalData.page && digitalData.page.attributes && digitalData.page.attributes.primaryAuthor) {
									let primaryAuthor = digitalData.page.attributes.primaryAuthor;
									console.log("Found primary author:", primaryAuthor);

									if (primaryAuthor) {
										if (typeof primaryAuthor === "string") {
											metadata.byline = primaryAuthor.trim();
										}
										console.log("Primary author set in _getByLineValueFromScript:", metadata.byline);
									}
								}
							}
							return;
						} catch (e) {
							console.error("Error parsing script content:", e);
						}
					}
				}
			}
		});
		return metadata ? metadata : {};
	},

	_getJSONLD: function (doc) {
		var scripts = this._getAllNodesWithTag(doc, ["script"]);
		// console.log("Found " + scripts.length + " script tags in _getJSONLD function.");

		var metadata;

		this._forEachNode(scripts, function (jsonLdElement) {
			if (!metadata && jsonLdElement.getAttribute("type") === "application/ld+json") {
				try {
					var content = jsonLdElement.textContent.replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g, "");
					var parsed = JSON.parse(content);
					if (!parsed["@context"] || !parsed["@context"].match(/^https?\:\/\/schema\.org$/)) {
						return;
					}

					if (!parsed["@type"] && Array.isArray(parsed["@graph"])) {
						parsed = parsed["@graph"].find(function (it) {
							return (it["@type"] || "").match(this.REGEXPS.jsonLdArticleTypes);
						});
					}

					if (!parsed || !parsed["@type"] || !parsed["@type"].match(this.REGEXPS.jsonLdArticleTypes)) {
						return;
					}

					metadata = {};

					if (
						typeof parsed.name === "string" &&
						typeof parsed.headline === "string" &&
						parsed.name !== parsed.headline
					) {
						// console.log("Article Title:", this._getArticleTitle());
						var title = this._getArticleTitle();
						var nameMatches = this._textSimilarity(parsed.name, title) > 0.75;
						var headlineMatches = this._textSimilarity(parsed.headline, title) > 0.75;

						if (headlineMatches && !nameMatches) {
							metadata.title = parsed.headline;
						} else {
							metadata.title = parsed.name;
						}
					} else if (typeof parsed.name === "string") {
						metadata.title = parsed.name.trim();
					} else if (typeof parsed.headline === "string") {
						metadata.title = parsed.headline.trim();
					}

					if (parsed.author) {
						if (typeof parsed.author.name === "string") {
							metadata.byline = parsed.author.name.trim();
						} else if (Array.isArray(parsed.author) && parsed.author[0] && typeof parsed.author[0].name === "string") {
							metadata.byline = parsed.author
								.filter(function (author) {
									return author && typeof author.name === "string";
								})
								.map(function (author) {
									return author.name.trim();
								})
								.join(", ");
						}
					}
					if (typeof parsed.description === "string") {
						metadata.excerpt = parsed.description.trim();
					}
					if (parsed.publisher && typeof parsed.publisher.name === "string") {
						metadata.siteName = parsed.publisher.name.trim();
					}
					return;
				} catch (err) {
					console.log(err.message);
				}
			}
		});

		this._forEachNode(scripts, function (scriptElement) {
			if (!metadata && scriptElement.getAttribute("type") === "text/javascript") {
				for (let i = 0; i < scripts.length; i++) {
					let scriptContent = scripts[i].textContent;
					// console.log("Inspecting script content:", scriptContent);
					if (scriptContent.includes("window.digitalData")) {
						metadata = {};
						try {
							// Extract the JSON object from the script content
							let jsonString = scriptContent.match(/window\.digitalData\s*=\s*({[\s\S]*?});/);
							if (jsonString && jsonString[1]) {
								// Parse the JSON object
								let digitalData = JSON.parse(jsonString[1]);

								// Extract the primary author
								if (digitalData.page && digitalData.page.attributes && digitalData.page.attributes.primaryAuthor) {
									let primaryAuthor = digitalData.page.attributes.primaryAuthor;
									console.log("Found primary author:", primaryAuthor);

									if (primaryAuthor) {
										if (typeof primaryAuthor === "string") {
											metadata.byline = primaryAuthor.trim();
										}
										console.log("Primary author set :", metadata.byline);
									}
								}
							}
						} catch (e) {
							console.error("Error parsing script content:", e);
						}
					}
				}
			}
		});
		return metadata ? metadata : {};
	},

	_getArticleMetadata: function (jsonld) {
		var metadata = {};
		var values = {};
		var metaElements = this._doc.getElementsByTagName("meta");

		var propertyPattern = /\s*(dc|dcterm|og|twitter)\s*:\s*(author|creator|description|title|site_name)\s*/gi;

		var namePattern =
			/^\s*(?:(dc|dcterm|og|twitter|weibo:(article|webpage))\s*[\.:]\s*)?(author|creator|description|title|site_name)\s*$/i;

		this._forEachNode(metaElements, function (element) {
			var elementName = element.getAttribute("name");
			var elementProperty = element.getAttribute("property");
			var content = element.getAttribute("content");
			if (!content) {
				return;
			}
			var matches = null;
			var name = null;

			if (elementProperty) {
				matches = elementProperty.match(propertyPattern);
				if (matches) {
					name = matches[0].toLowerCase().replace(/\s/g, "");
					// console.log("Name1: ", name);
					values[name] = content.trim();
				}
			}
			if (!matches && elementName && namePattern.test(elementName)) {
				name = elementName;
				if (content) {
					name = name.toLowerCase().replace(/\s/g, "").replace(/\./g, ":");
					// console.log("Name2: ", name);
					values[name] = content.trim();
				}
			}
		});

		metadata.fileName = jsonld.fileName || values["og:url"];

		if (!metadata.fileName) {
			let trimmedUrl = this._doc.baseURI.replace(/^https?:\/\/[^\/]+\//, "");

			trimmedUrl = trimmedUrl.split(/[?#]/)[0];
			let trimmedTitle = trimmedUrl.replace(/\//g, "-").replace(/[^a-zA-Z0-9-]/g, "");
			metadata.fileName = trimmedTitle.replace(/-+$/, "");

			// console.log("Title: ", metadata.fileName);
		}

		metadata.title =
			jsonld.title ||
			values["dc:title"] ||
			values["dcterm:title"] ||
			values["og:title"] ||
			values["weibo:article:title"] ||
			values["weibo:webpage:title"] ||
			values["title"] ||
			values["twitter:title"];

		if (!metadata.title) {
			metadata.title = this._getArticleTitle();
		}

		metadata.byline = jsonld.byline || values["dc:creator"] || values["dcterm:creator"] || values["author"];
		// console.log("Byline value using jsonld: ", metadata.byline);

		if (!metadata.byline) {
			this._getByLineValueFromScript(this._doc);
			// console.log("Byline value after setting from jsonld: ", metadata.byline);
		}

		metadata.excerpt =
			jsonld.excerpt ||
			values["dc:description"] ||
			values["dcterm:description"] ||
			values["og:description"] ||
			values["weibo:article:description"] ||
			values["weibo:webpage:description"] ||
			values["description"] ||
			values["twitter:description"];

		metadata.siteName = jsonld.siteName || values["og:site_name"];

		metadata.fileName = this._unescapeHtmlEntities(metadata.fileName);
		metadata.title = this._unescapeHtmlEntities(metadata.title);
		metadata.byline = this._unescapeHtmlEntities(metadata.byline);
		metadata.excerpt = this._unescapeHtmlEntities(metadata.excerpt);
		metadata.siteName = this._unescapeHtmlEntities(metadata.siteName);

		return metadata;
	},

	_isSingleImage: function (node) {
		if (node.tagName === "IMG") {
			return true;
		}

		if (node.children.length !== 1 || node.textContent.trim() !== "") {
			return false;
		}

		return this._isSingleImage(node.children[0]);
	},

	_unwrapNoscriptImages: function (doc) {
		var imgs = Array.from(doc.getElementsByTagName("img"));
		this._forEachNode(imgs, function (img) {
			for (var i = 0; i < img.attributes.length; i++) {
				var attr = img.attributes[i];
				switch (attr.name) {
					case "src":
					case "srcset":
					case "data-src":
					case "data-srcset":
						return;
				}

				if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
					return;
				}
			}

			img.parentNode.removeChild(img);
		});

		var noscripts = Array.from(doc.getElementsByTagName("noscript"));
		this._forEachNode(noscripts, function (noscript) {
			var tmp = doc.createElement("div");
			tmp.innerHTML = noscript.innerHTML;
			if (!this._isSingleImage(tmp)) {
				return;
			}

			var prevElement = noscript.previousElementSibling;
			if (prevElement && this._isSingleImage(prevElement)) {
				var prevImg = prevElement;
				if (prevImg.tagName !== "IMG") {
					prevImg = prevElement.getElementsByTagName("img")[0];
				}

				var newImg = tmp.getElementsByTagName("img")[0];
				for (var i = 0; i < prevImg.attributes.length; i++) {
					var attr = prevImg.attributes[i];
					if (attr.value === "") {
						continue;
					}

					if (attr.name === "src" || attr.name === "srcset" || /\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
						if (newImg.getAttribute(attr.name) === attr.value) {
							continue;
						}

						var attrName = attr.name;
						if (newImg.hasAttribute(attrName)) {
							attrName = "data-old-" + attrName;
						}

						newImg.setAttribute(attrName, attr.value);
					}
				}

				noscript.parentNode.replaceChild(tmp.firstElementChild, prevElement);
			}
		});
	},

	_removeScripts: function (doc) {
		this._removeNodes(this._getAllNodesWithTag(doc, ["script"]), function (scriptNode) {
			scriptNode.nodeValue = "";
			scriptNode.removeAttribute("src");
			return true;
		});
		this._removeNodes(this._getAllNodesWithTag(doc, ["noscript"]));
	},

	_hasSingleTagInsideElement: function (element, tag) {
		if (element.children.length != 1 || element.children[0].tagName !== tag) {
			return false;
		}

		return !this._someNode(element.childNodes, function (node) {
			return node.nodeType === this.TEXT_NODE && this.REGEXPS.hasContent.test(node.textContent);
		});
	},

	_isElementWithoutContent: function (node) {
		return (
			node.nodeType === this.ELEMENT_NODE &&
			node.textContent.trim().length == 0 &&
			(node.children.length == 0 ||
				node.children.length == node.getElementsByTagName("br").length + node.getElementsByTagName("hr").length)
		);
	},

	_hasChildBlockElement: function (element) {
		return this._someNode(element.childNodes, function (node) {
			return this.DIV_TO_P_ELEMS.has(node.tagName) || this._hasChildBlockElement(node);
		});
	},

	_isPhrasingContent: function (node) {
		return (
			node.nodeType === this.TEXT_NODE ||
			this.PHRASING_ELEMS.indexOf(node.tagName) !== -1 ||
			((node.tagName === "A" || node.tagName === "DEL" || node.tagName === "INS") &&
				this._everyNode(node.childNodes, this._isPhrasingContent))
		);
	},

	_isWhitespace: function (node) {
		return (
			(node.nodeType === this.TEXT_NODE && node.textContent.trim().length === 0) ||
			(node.nodeType === this.ELEMENT_NODE && node.tagName === "BR")
		);
	},

	_getInnerText: function (e, normalizeSpaces) {
		normalizeSpaces = typeof normalizeSpaces === "undefined" ? true : normalizeSpaces;
		var textContent = e.textContent.trim();

		if (normalizeSpaces) {
			return textContent.replace(this.REGEXPS.normalize, " ");
		}
		return textContent;
	},

	_getCharCount: function (e, s) {
		s = s || ",";
		return this._getInnerText(e).split(s).length - 1;
	},

	_cleanStyles: function (e) {
		if (!e || e.tagName.toLowerCase() === "svg") return;

		for (var i = 0; i < this.PRESENTATIONAL_ATTRIBUTES.length; i++) {
			e.removeAttribute(this.PRESENTATIONAL_ATTRIBUTES[i]);
		}

		if (this.DEPRECATED_SIZE_ATTRIBUTE_ELEMS.indexOf(e.tagName) !== -1) {
			e.removeAttribute("width");
			e.removeAttribute("height");
		}

		var cur = e.firstElementChild;
		while (cur !== null) {
			this._cleanStyles(cur);
			cur = cur.nextElementSibling;
		}
	},

	_getLinkDensity: function (element) {
		var textLength = this._getInnerText(element).length;
		if (textLength === 0) return 0;

		var linkLength = 0;

		this._forEachNode(element.getElementsByTagName("a"), function (linkNode) {
			var href = linkNode.getAttribute("href");
			var coefficient = href && this.REGEXPS.hashUrl.test(href) ? 0.3 : 1;
			linkLength += this._getInnerText(linkNode).length * coefficient;
		});

		return linkLength / textLength;
	},

	_getClassWeight: function (e) {
		if (!this._flagIsActive(this.FLAG_WEIGHT_CLASSES)) return 0;

		var weight = 0;

		if (typeof e.className === "string" && e.className !== "") {
			if (this.REGEXPS.negative.test(e.className)) weight -= 25;

			if (this.REGEXPS.positive.test(e.className)) weight += 25;
		}

		if (typeof e.id === "string" && e.id !== "") {
			if (this.REGEXPS.negative.test(e.id)) weight -= 25;

			if (this.REGEXPS.positive.test(e.id)) weight += 25;
		}

		return weight;
	},

	_clean: function (e, tag) {
		var isEmbed = ["object", "embed", "iframe"].indexOf(tag) !== -1;

		this._removeNodes(this._getAllNodesWithTag(e, [tag]), function (element) {
			if (isEmbed) {
				for (var i = 0; i < element.attributes.length; i++) {
					if (this.REGEXPS.videos.test(element.attributes[i].value)) {
						return false;
					}
				}

				if (element.tagName === "object" && this.REGEXPS.videos.test(element.innerHTML)) {
					return false;
				}
			}

			return true;
		});
	},

	_hasAncestorTag: function (node, tagName, maxDepth, filterFn) {
		maxDepth = maxDepth || 3;
		tagName = tagName.toUpperCase();
		var depth = 0;
		while (node.parentNode) {
			if (maxDepth > 0 && depth > maxDepth) return false;
			if (node.parentNode.tagName === tagName && (!filterFn || filterFn(node.parentNode))) return true;
			node = node.parentNode;
			depth++;
		}
		return false;
	},

	_getRowAndColumnCount: function (table) {
		var rows = 0;
		var columns = 0;
		var trs = table.getElementsByTagName("tr");
		for (var i = 0; i < trs.length; i++) {
			var rowspan = trs[i].getAttribute("rowspan") || 0;
			if (rowspan) {
				rowspan = parseInt(rowspan, 10);
			}
			rows += rowspan || 1;

			var columnsInThisRow = 0;
			var cells = trs[i].getElementsByTagName("td");
			for (var j = 0; j < cells.length; j++) {
				var colspan = cells[j].getAttribute("colspan") || 0;
				if (colspan) {
					colspan = parseInt(colspan, 10);
				}
				columnsInThisRow += colspan || 1;
			}
			columns = Math.max(columns, columnsInThisRow);
		}
		return { rows: rows, columns: columns };
	},

	_markDataTables: function (root) {
		var tables = root.getElementsByTagName("table");
		for (var i = 0; i < tables.length; i++) {
			var table = tables[i];
			var role = table.getAttribute("role");
			if (role == "presentation") {
				table._readabilityDataTable = false;
				continue;
			}
			var datatable = table.getAttribute("datatable");
			if (datatable == "0") {
				table._readabilityDataTable = false;
				continue;
			}
			var summary = table.getAttribute("summary");
			if (summary) {
				table._readabilityDataTable = true;
				continue;
			}

			var caption = table.getElementsByTagName("caption")[0];
			if (caption && caption.childNodes.length > 0) {
				table._readabilityDataTable = true;
				continue;
			}

			var dataTableDescendants = ["col", "colgroup", "tfoot", "thead", "th"];
			var descendantExists = function (tag) {
				return !!table.getElementsByTagName(tag)[0];
			};
			if (dataTableDescendants.some(descendantExists)) {
				this.log("Data table because found data-y descendant");
				table._readabilityDataTable = true;
				continue;
			}

			if (table.getElementsByTagName("table")[0]) {
				table._readabilityDataTable = false;
				continue;
			}

			var sizeInfo = this._getRowAndColumnCount(table);
			if (sizeInfo.rows >= 10 || sizeInfo.columns > 4) {
				table._readabilityDataTable = true;
				continue;
			}
			table._readabilityDataTable = sizeInfo.rows * sizeInfo.columns > 10;
		}
	},

	_fixLazyImages: function (root) {
		this._forEachNode(this._getAllNodesWithTag(root, ["img", "picture", "figure"]), function (elem) {
			if (elem.src && this.REGEXPS.b64DataUrl.test(elem.src)) {
				var parts = this.REGEXPS.b64DataUrl.exec(elem.src);
				if (parts[1] === "image/svg+xml") {
					return;
				}

				var srcCouldBeRemoved = false;
				for (var i = 0; i < elem.attributes.length; i++) {
					var attr = elem.attributes[i];
					if (attr.name === "src") {
						continue;
					}

					if (/\.(jpg|jpeg|png|webp)/i.test(attr.value)) {
						srcCouldBeRemoved = true;
						break;
					}
				}

				if (srcCouldBeRemoved) {
					var b64starts = elem.src.search(/base64\s*/i) + 7;
					var b64length = elem.src.length - b64starts;
					if (b64length < 133) {
						elem.removeAttribute("src");
					}
				}
			}

			if ((elem.src || (elem.srcset && elem.srcset != "null")) && elem.className.toLowerCase().indexOf("lazy") === -1) {
				return;
			}

			for (var j = 0; j < elem.attributes.length; j++) {
				attr = elem.attributes[j];
				if (attr.name === "src" || attr.name === "srcset" || attr.name === "alt") {
					continue;
				}
				var copyTo = null;
				if (/\.(jpg|jpeg|png|webp)\s+\d/.test(attr.value)) {
					copyTo = "srcset";
				} else if (/^\s*\S+\.(jpg|jpeg|png|webp)\S*\s*$/.test(attr.value)) {
					copyTo = "src";
				}
				if (copyTo) {
					//if this is an img or picture, set the attribute directly
					if (elem.tagName === "IMG" || elem.tagName === "PICTURE") {
						elem.setAttribute(copyTo, attr.value);
					} else if (elem.tagName === "FIGURE" && !this._getAllNodesWithTag(elem, ["img", "picture"]).length) {
						//if the item is a <figure> that does not contain an image or picture, create one and place it inside the figure
						//see the nytimes-3 testcase for an example
						var img = this._doc.createElement("img");
						img.setAttribute(copyTo, attr.value);
						elem.appendChild(img);
					}
				}
			}
		});
	},

	_getTextDensity: function (e, tags) {
		var textLength = this._getInnerText(e, true).length;
		if (textLength === 0) {
			return 0;
		}
		var childrenLength = 0;
		var children = this._getAllNodesWithTag(e, tags);
		this._forEachNode(children, (child) => (childrenLength += this._getInnerText(child, true).length));
		return childrenLength / textLength;
	},

	_cleanConditionally: function (e, tag) {
		if (!this._flagIsActive(this.FLAG_CLEAN_CONDITIONALLY)) return;

		//
		this._removeNodes(this._getAllNodesWithTag(e, [tag]), function (node) {
			var isDataTable = function (t) {
				return t._readabilityDataTable;
			};

			var isList = tag === "ul" || tag === "ol";
			if (!isList) {
				var listLength = 0;
				var listNodes = this._getAllNodesWithTag(node, ["ul", "ol"]);
				this._forEachNode(listNodes, (list) => (listLength += this._getInnerText(list).length));
				isList = listLength / this._getInnerText(node).length > 0.9;
			}

			if (tag === "table" && isDataTable(node)) {
				return false;
			}

			if (this._hasAncestorTag(node, "table", -1, isDataTable)) {
				return false;
			}

			if (this._hasAncestorTag(node, "code")) {
				return false;
			}

			var weight = this._getClassWeight(node);

			this.log("Cleaning Conditionally", node);

			var contentScore = 0;

			if (weight + contentScore < 0) {
				return true;
			}

			if (this._getCharCount(node, ",") < 10) {
				var p = node.getElementsByTagName("p").length;
				var img = node.getElementsByTagName("img").length;
				var li = node.getElementsByTagName("li").length - 100;
				var input = node.getElementsByTagName("input").length;
				var headingDensity = this._getTextDensity(node, ["h1", "h2", "h3", "h4", "h5", "h6"]);

				var embedCount = 0;
				var embeds = this._getAllNodesWithTag(node, ["object", "embed", "iframe"]);

				for (var i = 0; i < embeds.length; i++) {
					for (var j = 0; j < embeds[i].attributes.length; j++) {
						if (this.REGEXPS.videos.test(embeds[i].attributes[j].value)) {
							return false;
						}
					}

					if (embeds[i].tagName === "object" && this.REGEXPS.videos.test(embeds[i].innerHTML)) {
						return false;
					}

					embedCount++;
				}

				var linkDensity = this._getLinkDensity(node);
				var contentLength = this._getInnerText(node).length;

				var haveToRemove =
					(img > 1 && p / img < 0.5 && !this._hasAncestorTag(node, "figure")) ||
					(!isList && li > p) ||
					input > Math.floor(p / 3) ||
					(!isList &&
						headingDensity < 0.9 &&
						contentLength < 25 &&
						(img === 0 || img > 2) &&
						!this._hasAncestorTag(node, "figure")) ||
					(!isList && weight < 25 && linkDensity > 0.2) ||
					(weight >= 25 && linkDensity > 0.5) ||
					(embedCount === 1 && contentLength < 75) ||
					embedCount > 1;
				return haveToRemove;
			}
			return false;
		});
	},

	_cleanMatchedNodes: function (e, filter) {
		var endOfSearchMarkerNode = this._getNextNode(e, true);
		var next = this._getNextNode(e);
		while (next && next != endOfSearchMarkerNode) {
			if (filter.call(this, next, next.className + " " + next.id)) {
				next = this._removeAndGetNext(next);
			} else {
				next = this._getNextNode(next);
			}
		}
	},

	_cleanHeaders: function (e) {
		let headingNodes = this._getAllNodesWithTag(e, ["h1", "h2"]);
		this._removeNodes(headingNodes, function (node) {
			let shouldRemove = this._getClassWeight(node) < 0;
			if (shouldRemove) {
				this.log("Removing header with low class weight:", node);
			}
			return shouldRemove;
		});
	},

	_headerDuplicatesTitle: function (node) {
		if (node.tagName != "H1" && node.tagName != "H2") {
			return false;
		}
		var heading = this._getInnerText(node, false);
		this.log("Evaluating similarity of header:", heading, this._articleTitle);
		return this._textSimilarity(this._articleTitle, heading) > 0.75;
	},

	_flagIsActive: function (flag) {
		return (this._flags & flag) > 0;
	},

	_removeFlag: function (flag) {
		this._flags = this._flags & ~flag;
	},

	_isProbablyVisible: function (node) {
		return (
			(!node.style || node.style.display != "none") &&
			!node.hasAttribute("hidden") &&
			//check for "fallback-image" so that wikimedia math images are displayed
			(!node.hasAttribute("aria-hidden") ||
				node.getAttribute("aria-hidden") != "true" ||
				(node.className && node.className.indexOf && node.className.indexOf("fallback-image") !== -1))
		);
	},

	parse: function () {
		if (this._maxElemsToParse > 0) {
			var numTags = this._doc.getElementsByTagName("*").length;
			if (numTags > this._maxElemsToParse) {
				throw new Error("Aborting parsing document; " + numTags + " elements found");
			}
		}

		this._unwrapNoscriptImages(this._doc);

		var jsonLd = this._disableJSONLD ? {} : this._getJSONLD(this._doc);

		var metadata1 = this._getByLineValueFromScript(this._doc);
		// console.log("Metadata1 byline : ", metadata1.byline);

		this._removeScripts(this._doc);

		this._prepDocument();

		var metadata = this._getArticleMetadata(jsonLd);
		// console.log("Metadata byline : ", metadata.byline);
		this._articleTitle = metadata.title;

		var articleContent = this._grabArticle();
		if (!articleContent) return null;

		this.log("Grabbed: " + articleContent.innerHTML);

		this._postProcessContent(articleContent);

		if (!metadata.excerpt) {
			var paragraphs = articleContent.getElementsByTagName("p");
			if (paragraphs.length > 0) {
				metadata.excerpt = paragraphs[0].textContent.trim();
			}
		}

		var textContent = articleContent.textContent;
		// console.log("Byline value before assignment: ", metadata.byline);

		// if (this._articleByline) {
		// console.log("this._articleByline value : ", this._articleByline);
		// }

		return {
			fileName: metadata.fileName,
			title: this._articleTitle,
			byline: metadata1.byline || metadata.byline || this._articleByline,
			dir: this._articleDir,
			lang: this._articleLang,
			content: this._serializer(articleContent),
			textContent: textContent,
			length: textContent.length,
			excerpt: metadata.excerpt,
			siteName: metadata.siteName || this._articleSiteName,
		};
	},
};

if (typeof module === "object") {
	module.exports = Readability;
}
