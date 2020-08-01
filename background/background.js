// add notification listener for foreground page messages
browser.runtime.onMessage.addListener(notify);

// convert the article content to markdown using Turndown
function convertArticleToMarkdown(article) {
  var turndownService = new TurndownService();
  var markdown = turndownService.turndown(article.content);
  
  //add article title as header
  markdown = "# " + article.title + "\n" + markdown;

  //add summary if exist
  if (article.excerpt != null) {
    markdown = "> " + article.excerpt + "\n\n" + markdown;
  }

  return markdown;
}

// function to turn the title into a valid file name
function generateValidFileName(title) {
  // remove < > : " / \ | ? * 
  // and non-breaking spaces (thanks @Licat)
  var illegalRe = /[\/\?<>\\:\*\|":]/g;
  var name = title.replace(illegalRe, "").replace('\u00A0', ' ');
  return name;
}

// function to actually download the markdown file
function downloadMarkdown(markdown, title) {
  var blob = new Blob([markdown], {
    type: "text/markdown;charset=utf-8"
  });
  var url = URL.createObjectURL(blob);

  browser.downloads.download({
    url: url,
    filename: generateValidFileName(title) + ".md"
  }).then((id) => {
    browser.downloads.onChanged.addListener((delta ) => {
      //release the url for the blob
      if (delta.state && delta.state.current == "complete") {
        if (delta.id === id) {
          window.URL.revokeObjectURL(url);
        }
      }
    });
  }).catch((err) => {
    console.error("Download failed" + err)
  });
}

//function that handles messages from the injected script into the site
function notify(message) {
  // message for initial clipping of the dom
  if (message.type == "clip") {

    // parse the dom
    var parser = new DOMParser();
    var dom = parser.parseFromString(message.dom, "text/html");
    if (dom.documentElement.nodeName == "parsererror") {
      console.error("error while parsing");
    }

    // make markdown document from the dom
    var markdown = convertArticleToMarkdown(new Readability(dom).parse());

    // add url to the top of the markdown
    markdown = dom.baseURI + "\n\n" + markdown;

    // send a message to display the markdown
    browser.runtime.sendMessage({ type: "display.md", markdown: markdown, article: article });
  }
  // message for triggering download
  else if (message.type == "download") {
    downloadMarkdown(message.markdown, message.title);
  }
}
