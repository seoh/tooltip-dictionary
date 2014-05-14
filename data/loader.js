var URL = "http://tooltip.dic.naver.com/tooltip.nhn?wordString=${query}&languageCode=4&nlp=false";
// http://sug.dic.daum.net/dic_all_ctsuggest?mod=json&code=utf_in_out&enc=utf&cate=lan&callback=callback&q=${query}

/*
	Response Sample

	- naver
	{ "entryID":830780
	, "entryName":"parallels"
	,"mean":["평행의","평행선","나란한","서로 같은","같은 방향의"]
	,"origin":"^"
	,"pronunFile":["/endic/sound/us/0830000/0830780.mp3"]
	,"pronunSymbol":["<img src=\"http://sstatic.naver.com/endic/2005/images/font/syn/e0f9.gif\" align=absmiddle>, ...]
	}

	- daum
	callback(
		{ "rq" : "parallels"
		, "items" : 
			["kuek|parallel sailing|거등권 항법"
			,"kuek|parallel scan|평행스캔"
			,"kuek|parallel serial operation|병렬-직렬 연산"
			,"kuek|parallel slalom|패럴렐 슬라롬"
			,"kuek|parallel slide valve|평행 슬라이드 밸브"
			]
		, "r_items" : [] 
		}
	);
 */

var $ = function(el){ 
	var Wrap = function(){};
	Wrap.prototype.set = function(prop, value, impo) {
		if( impo )
			el.style.setProperty(prop, value, "important");
		else
			el.style.setProperty(prop, value);
		return this;
	};
	return new Wrap();
};

function Loader(preference) {
	this.tooltip = {
		obj: null,
		timer: null,
		delay: 20,
		position: { x: 0, y:0 }
	};

	var div = this.tooltip.obj = document.createElement('div');
	div.id = "tooltip-dictionary";
	$(div)
		.set('position', 'absolute', true)
		.set('border', '1px solid #707070')
		.set('padding', '1px 5px', true)
		.set('background', 'linear-gradient(to bottom, #DCDCDC, #F0F0F0)', true)
		.set('box-shadow', '2px 2px 5px rgba(0,0,0,.4)');

	document.body.appendChild(div);

	var that = this;
	self.port.on("response", function(response){
		response = JSON.parse(response);
		if(response.mean && response.mean.length )
			that.show(response.mean);
		else
			that.hide();
	});

	return function(event) {
		var text, offset;
		that.tooltip.position.x = event.pageX;
		that.tooltip.position.y = event.pageY;

		/**
		 * Get hovered text from mouse point.
		 * Not yet tested in WebKit case
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/document.caretPositionFromPoint
		 */
		if( document.caretPositionFromPoint ) {
			var range = document.caretPositionFromPoint(event.clientX, event.clientY);
			var node = range.offsetNode;

			if( node && node.nodeType === 3 ) {
				text = node.textContent;
				offset = range.offset;
			}
		} else if( document.caretRangeFromPoint ) { // WebKit
			var range = document.caretRangeFromPoint(event.clientX, event.clientY);
			var node = range.startContainer; // or `range.commonAncestorContainer`
			if( node && node.nodeType === 3 ) {
				var goodbye = function(event){
					that.hide();
					console.log(goodbye);
					event.target.removeEventListener('mouseleave', goodbye);
				};
				// node.addEventListener('mouseleave', goodbye); // do not need?
				text = node.textContent;
				offset = node.startOffset;
			}
		}

		if( text ) {
			text = that.parseWord(text, offset);
			that.delayedRequest(text);
		} else {
			that.hide();
		}
	};
}


/**
	Proposal for supporting various dictionary
	- loop
		forward/backward index
		regexp match loop
	- capture
		regexp : need to know regexp
		charcode : object of range
 */
 Loader.prototype.parseWord = function(text, offset) {
	/**
	 * #TODO to be at preference of pre-defined. but how can reset lastIndex?
	 */
	var test = [
		/[a-zA-Z]+/g
	];

	var ret = [];
	for(var i=0, l=test.length ; i<l ; i++) {
		var reg = test[i]
			, matched;
		while( (matched = reg.exec(text)) !== null ){
			if( matched.index <= offset && offset < reg.lastIndex ) {
				ret.push(text.substring(matched.index, reg.lastIndex));
				break;
			}
		}
	}
	return ret;
};

Loader.prototype.delayedRequest = function(text) {
	if( this.tooltip.timer )
		this.cancelRequest();

	var that = this;
	this.tooltip.timer = setTimeout(function(){
		that.tooltip.timer = null;
		self.port.emit('request', URL.replace("${query}", text));
	}, this.tooltip.delay);
};

Loader.prototype.cancelRequest = function() {
	clearTimeout(this.tooltip.timer);
	this.tooltip.timer = null;

	// abort request if need
};

Loader.prototype.show = function(text) {
	var div = this.tooltip.obj;
	div.textContent = text.join(', ');
	$(div)
		.set('display', 'block')
		.set('left', this.tooltip.position.x + 'px')
		.set('top', this.tooltip.position.y + 20 + 'px');
};

Loader.prototype.hide = function() {
	$(this.tooltip.obj).set('display', 'none');
};

var preference = null; // #TODO load with Preference
window.addEventListener('mousemove', new Loader(preference), true);