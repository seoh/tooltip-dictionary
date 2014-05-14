const { Request } = require("sdk/request");

require("sdk/page-mod").PageMod({
  include: "*",
  contentScriptFile:
  	require("sdk/self").data.url("loader.js"),
  onAttach: function(worker) {
		worker.port.on("request", function(url) {
			Request({
			  url: url,
			  onComplete: function (response) {
			    worker.port.emit("response", JSON.stringify(response.json));
			  }
			}).get();
		});
	}
});