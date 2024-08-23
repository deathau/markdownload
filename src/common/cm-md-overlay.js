export default {
  token: function(stream, state) {
    var ch;
    // == highlight ==
    if (stream.match("==")) {
      while ((ch = stream.next()) != null)
        if (ch == "=" && stream.next() == "=") {
          stream.eat("=");
          return "highlight";
        }
    }
    while (stream.next() != null && !stream.match("==", false)) {}
    return null;
  }
}