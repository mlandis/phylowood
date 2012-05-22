

/***
FILE HANDLING
***/
// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  ; // All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

// Store file contents to Phylowood.data.infile
function handleFileSelect(evt) {
	var f = evt.target.files[0];
	var fr = new FileReader();

	fr.onload = function(e) {
		var txtArea = document.createElement('textarea');
		txtArea.value = this.result;
		document.getElementById('divGeo').appendChild(txtArea);
		Phylowood.Data.infile = this.result;
	};
	fr.onerror = function(e) {
		//alert("error");
	};
	fr.readAsText(f);
}
document.getElementById('files').addEventListener('change', handleFileSelect, false);


/***
INITIALIZE DATA
***/
var Phylowood = {
	Geo : null,
	Tree: null,
	that : this,
	init : function() {
		this.geo = "2";
	},
	talk : function() {
		alert(this.geo);
	}
};



var Node = function(){
	/**
	* Node Class (from jsPhyloSvg)
	* Allows objects to be traversed across children
	* 
	*/
	return function(o, parentInstance){
		// initiate object
		this.id = Phylowood.Common.nodeIdIncrement += 1;
		this.level = 0;
		this.len = 0;
		this.newickLen = 0;
		this.name = '';
		this.type = '';
		this.chart = {};
		this.img = [];
		
		if(o) Phylowood.Common.apply(this, o);

		/* Cache Calculations */
		this._countAllChildren = false;
		this._countImmediateChildren = false;
		this._midBranchPosition = false;
		
		this.children = new Array();
		
		if(parentInstance){
			parentInstance.children.push(this); 
		}
	}
}();

function Tree(newickStr) {
	this.nodes = [];
	
	// tokenize
	var newickTokens = [];
	var newickStrLen = newickStr.length;

}



Phylowood.Data.NewickParse = function(){

	var text,
	ch,
	pos,
	mLevel = 0,
	mNewickLen = 0,
	root,
	validate,
		
	object = function (parentNode) {
		var node  = new Node();
		
		while (ch !== ')' && ch !== ',') {
			if (ch === ':'){
				next();
				node.v = string();
				if(node.v == 0){
					node.v = 0.0001;
				}
			} else if (ch === "'" || ch === '"'){ 
				node.type = "label";
				node.name = quotedString(ch);
			} else {
				node.type = "label";
				node.name = string();
			}
		}
		node.level = parentNode.level + 1;
		return node;
	},
	
	objectIterate = function(parentNode){
		var node = new Node();
		if(parentNode){
			node.level = parentNode.level + 1;
		}
		
		while( ch !== ')' ){
			next();
			if( ch === '(' ) {
				node.children.push(objectIterate(node));
			} else {
				node.children.push(object(node));
			}
		}
		
		next();
		if(ch !== ':' && ch !== ')' && ch !== ',' && ch !== ';'){
			node.type = "label";
			node.name = string();
		}
		if(ch === ':'){
			next();
			node.v = string();
			if(node.v == 0){
				node.v = 0.0001;
			}
			node.type = "stem";

		}
		return node;		
	},
	
	string = function(){
		var string = '';
		
		while (ch !== ':' && ch !== ')' && ch !== ',' && ch !== ';'){
			string += ch;
			next();
		}
		return string;
	},

	quotedString = function(quoteType){
		var string = '';
		
		while (ch !== quoteType){
			string += ch;
			next();
		}
		return string;
	},	
	
	
	next = function() {
		ch = text.charAt(pos);
		pos += 1;
		return ch;
	},
	
	recursiveProcessRoot = function(node, parentNode){
		
		if(node.children && node.children.length){
			for( var i = 0; i < node.children.length; i++ ){
				var child = node.children[i];
				if(child.len === 0) {	// Dendogram
					child.len = 1;	
				}
				child.newickLen = child.len + node.newickLen;
				if(child.level > mLevel) mLevel = child.level;
				if(child.newickLen > mNewickLen) mNewickLen = child.newickLen;
				if(child.children.length > 0){
					recursiveProcessRoot(child, node); 
				}				
			}
		}
		return node;
	};

	return function(parseText){
		/* Privileged Methods */
		this.getRoot = function(){
			return root;
		};
		this.getLevels = function(){
			return mLevel;
		};
		this.getNewickLen = function(){
			return mNewickLen;
		};		
		this.getValidate = function(){
			return validate;
		};		
		
		
		/* CONSTRUCTOR */	
		mLevel = 0;
		mNewickLen = 0;
		
		text = parseText;
		pos = 0;
		
		next();
		root = objectIterate();
		root = recursiveProcessRoot(root);
	}

}();

Phylowood.Data.NewickParse.prototype = {
};