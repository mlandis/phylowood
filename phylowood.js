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
	var f;
	f = evt.target.files[0];
	var fr = new FileReader();

	fr.onload = function(e) {
		/*
		var txtArea = document.createElement('textarea');
		txtArea.value = this.result;
		document.getElementById('divGeo').appendChild(txtArea);
		*/
		Phylowood.Data.infile = this.result;
		// console.log("inputFile.result = " + this.result);
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

var Phylowood = Phylowood || {};

Phylowood.init = function() {
	this.parseInput(this.Data.infile);
};

Phylowood.parseInput = function(inputStr) {

	// parse inputStr
	var inputTokens = inputStr.split(/\r\n|\r|\n/);
		
	var treeStr = "",
		geoStr = "",
		statesStr = "",
		parseSelect = "";
	
	for (var i = 0; i < inputTokens.length; i++) {
		if (inputTokens[i] === "#GEO")
			parseSelect = "geo";
		else if (inputTokens[i] === "#STATES")
			parseSelect = "states";
		else if (inputTokens[i] === "#TREE")
			parseSelect = "tree";
		else if (parseSelect === "geo")
			geoStr += inputTokens[i] + "\n";
		else if (parseSelect === "states")
			statesStr += inputTokens[i] + "\n";
		else if (parseSelect === "tree")
			treeStr += inputTokens[i] + "\n";
	}
	
	// parse and init inputStr.substr()
	this.initStates(statesStr);
	this.initGeo(geoStr);
	this.initTree(treeStr);
};

Phylowood.initStates = function(statesStr) {
	
	this.Data.taxa = [];
	this.Data.states = [];
	
	var statesTokens = statesStr.split("\n");
	var taxonTokens;
	
	for (var i = 0; i < statesTokens.length; i++) {
		taxonTokens = statesTokens[i].split(" ");
		if (taxonTokens.length > 1) {
			this.Data.taxa.push(taxonTokens[0]);
			var taxonVals = [];
			for (var j = 1; j < taxonTokens.length; j++) {
				taxonVals.push(parseFloat(taxonTokens[j]));
			}
			this.Data.states.push(taxonVals);
		}
	}
	
	/*
	console.log("Phylowood.initStates():");
	console.log(this.Data.taxa);
	console.log(this.Data.states);
	*/
};

Phylowood.initGeo = function(geoStr) {
	
	// parse string for geoCoords
	this.Data.geoCoords = [];
	
	var geoTokens = geoStr.split("\n");
	var coordTokens;
	var maxN = -181.0, maxS = 181.0, maxE = -181.0, maxW = 181.0;
	
	// input expects "latitude longitude"
	// maps to [i][0] and [i][1] resp.
	for (var i = 0; i < geoTokens.length; i++) {
		var coordVals = [];
		coordTokens = geoTokens[i].split(" ");
		if (coordTokens.length == 2) {
			// store coordinates
			coordVals.push(parseFloat(coordTokens[0]));
			coordVals.push(parseFloat(coordTokens[1]));
			this.Data.geoCoords.push(coordVals);
			
			// compute maxima for geographical coordinates
			if (this.Data.geoCoords[i][0] > maxN)
				maxN = this.Data.geoCoords[i][0];
			if (this.Data.geoCoords[i][0] < maxS)
				maxS = this.Data.geoCoords[i][0];
			if (this.Data.geoCoords[i][1] > maxE)
				maxE = this.Data.geoCoords[i][1];
			if (this.Data.geoCoords[i][1] < maxW)
				maxW = this.Data.geoCoords[i][1];
		}
	}
	
	var numAreas = this.Data.geoCoords.length;
	
	// construct distance matrix geoDistances
	this.distanceType = "Euclidean";
	this.Data.geoDistances = [];
	for (var i = 0; i < numAreas; i++) {
		var distanceVals = [];
		for (var j = 0; j < numAreas; j++) {
			if (i === j) {
				distanceVals.push(0.0);
			}
			else {
				distanceVals.push( Phylowood.distance(
					this.Data.geoCoords[i],
					this.Data.geoCoords[j]));
			}
		}
		this.Data.geoDistances.push(distanceVals);
	}
	
	// define drawable space for map and coordinates
	var buffer = 0.1; // geo buffer, so max coordinates are not on border
	var divH = document.getElementById("divGeo").offsetHeight;
	var divW = document.getElementById("divGeo").offsetWidth;
	var divMargin = 0.1; // div margin, smaller img
	var divMarginH = divH * divMargin / 2;
	var divMarginW = divW * divMargin / 2;
	
	var geoMargin = 0.1;
	var geoScaleH = maxN - maxS;
	var geoScaleW = maxE - maxW;
	var geoMarginH = geoScaleH * geoMargin / 2;
	var geoMarginW = geoScaleW * geoMargin / 2;
	
	
	// rescale dimensions according to max coordinates.
	/*
	var scaleByH = (geoScaleH > geoScaleW ? true : false);
	if (scaleByH)
		divW = divW * geoScaleH / geoScaleW;
	*/
	divH = divH * (1.0 - divMargin);
	divW = divW * (1.0 - divMargin);


	// scale coordinates
	this.Data.divCoords = [];
	for (var i = 0; i < numAreas; i++) {
		var coordVals = [];
		coordVals.push( (-this.Data.geoCoords[i][0] + maxN) * (1.0 - geoMarginH) / geoScaleH * divH + divMarginH);
		coordVals.push( (this.Data.geoCoords[i][1] - maxW) * (1.0 - geoMarginW) / geoScaleW * divW + divMarginW);
		this.Data.divCoords.push(coordVals);
	}

	// load map

	// ... dynamically, via OpenLayers

	// e.g.
	var olW, olE, olN, olS;
	if (geoScaleH > geoScaleW) {
		olScaleW = geoScaleH - geoScaleW;
	}
	else {
		olScaleH = (geoScaleW - geoScaleH);
	}
	
	this.Data.olmap = new OpenLayers.Map("divGeo");
	this.Data.olwms = new OpenLayers.Layer.WMS( "OpenLayers WMS", 
                                            "http://labs.metacarta.com/wms/vmap0?", 
                                            {'layers': 'basic'},
                                            {'minExtent': new OpenLayers.Bounds(-1,-1,1,1),
                                             'maxExtent': new OpenLayers.Bounds(maxW,maxS,maxE,maxN),
                                             'minResolution': "auto",
                                             'maxResolution': "auto"});
	this.Data.olmap.addLayer(this.Data.olwms);
	this.Data.olmap.zoomToMaxExtent();
	//OpenLayers.Control.DragPan.

/*
	// ... statically, via createElement and filepath
	var imageFile = "./phylowood.default.jpg";

	var geoImage = document.createElement("IMG");
	geoImage.src = imageFile;
	document.getElementById("divGeo").appendChild(geoImage);
*/

	/*
	console.log("Phylowood.initGeo():");
	console.log(this.Data.geoCoords);
	console.log(this.Data.divCoords);
	console.log(this.Data.geoDistances);
	*/
};

Phylowood.distance = function(x, y) {
	var z = 0.0;
	if (this.distanceType === "Euclidean") {
		// fast and easy
		for (var i = 0; i < x.length; i++) {
			z += (x[i] - y[i])^2;
		}
		z = z^0.5;
	}
	else if (this.distanceType === "haversine") {
		// implement if needed
		;
	}
	else {
		alert("Phylowood.distance(): unknown distance \"" + this.distanceType + "\"");
		z = -1.0;
	}
	return z;
};


Phylowood.initTree = function(newickStr) {
	
	//this.tree = new thisTree();
	var nodes = [this.Data.taxa.size];
	
	// parse Newick string
	var readTip = true;
	var numNodes = 0;

	
	// parse Newick string
	var readTaxonName = false;
	var readBrlen = false;
	var numTaxa = 0;
	var temp = "";
	var newickTokens = [];
	for (var i = 0; i < newickStr.length; i++) {
		var c = newickStr[i];
		if (c === ' ')
			continue;
		if (c === '(' || c === ')' || c === ',' || c === ':' || c === ';') {
			temp = c;
			newickTokens.push(temp);
			if ( c === ':' )
				readBrlen = true;
			else
				readBrlen = false;
		}
		else {
			// the character is part of a taxon name
			var j = i;
			var taxonName = "";
			while ( newickStr[j] !== '('
			     && newickStr[j] !== ')'
			     && newickStr[j] !== ','
			     && newickStr[j] !== ':'
			     && newickStr[j] !== ';' )
			{
				taxonName += newickStr[j];
				j++;
			}
			newickTokens.push(taxonName);
			i = j - 1;
			if ( readBrlen === false )
				numTaxa++;
			readBrlen = false;
		}
		if ( c === ';' )
			break;
	}
	console.log(newickTokens);
	
	// construct Tree from newickTokens
	
	var intNodeIdx = 0;
	var p = null;
	var root = null;
	pIdx = -1;
	readBrlen = false;
	
	for (var i = 0; i < newickTokens.length; i++) {
		//std::cout << (*t) << std::endl;
		if ( newickTokens[i] === "(" )
			{
			if (p === null) {
			}
			else {
			}
			readBrlen = false;
		}
		else if ( newickTokens[i] === ")" ) {
            if (p.ancestor !== null)
                
            else
                console.log("Phylowood.initTree(): Problem going down tree");
			readBrlen = false;
		}
		else if ( newickTokens[i] === "," ) {
            if (p.ancestor !== null)
                p = nodes[p.ancestor];
            else
                console.log("Phylowood.initTree(): Problem going down tree");
			readBrlen = false;
		}
		else if ( newickTokens[i] === ":" )
		{
			readBrlen = true;
		}
		else if ( newickTokens[i] === ";" ) {
			; // do nothing
		}
		else {
			if (readBrlen == false) {
               
			}
			else {
				// reading a branch length 
				var x = parseFloat(newickTokens[i]);
				if (x < 0.00001)
					x = 0.00001;
                p.len = x;
                treeLength += x;
				readBrlen = false;
			}
		}
	}
	
	/*
	for (var i = 0; i < newickTokens.length; i++) {
		//std::cout << (*t) << std::endl;
		if ( newickTokens[i] === "(" )
			{
			// add a new interior node
			if (p === null) {
                p = new Phylowood.Node;
                p.id = intNodeIdx;
                intNodeIdx++;
                nodes.push(p);
                pIdx = nodes.length;
                root = p;
			}
			else {
				var q = new Phylowood.Node;
                q.id = intNodeIdx;
                intNodeIdx++;
                q.ancestor = p.id;
                nodes.push(q);
                nodes[pIdx].descendants.push(q);
                p = q;
			}
			//std::stringstream ss;
			readBrlen = false;
		}
		else if ( newickTokens[i] === ")" ) {
            if (p.ancestor !== null)
                p = nodes[p.ancestor];
            else
                console.log("Phylowood.initTree(): Problem going down tree");
			readBrlen = false;
		}
		else if ( newickTokens[i] === "," ) {
            if (p.ancestor !== null)
                p = nodes[p.ancestor];
            else
                console.log("Phylowood.initTree(): Problem going down tree");
			readBrlen = false;
		}
		else if ( newickTokens[i] === ":" )
		{
			readBrlen = true;
		}
		else if ( newickTokens[i] === ";" ) {
			; // do nothing
		}
		else {
			if (readBrlen == false) {
                var tipName = newickTokens[i];
                var tipIdx = -1;
                for (var i = 0; i < this.Data.taxa.length; i++) {
                    if ( tipName == this.Data.taxa[i] ) {
                        tipIdx = i;
                        break;
					}
				}
                if (tipIdx === -1)
                    console.log("Phylowood.initTree(): Could not find taxon " + tipName + " in the list of taxon names");
                
				var q = new Phylowood.Node;
				q.id = tipIdx;
				q.ancestor = p.id;
				q.name = this.Data.taxa[tipIdx];
                nodes.push(q);
                nodes[p.id].descendants.push(q);
                p = q;
			}
			else {
				// reading a branch length 
				var x = parseFloat(newickTokens[i]);
				if (x < 0.00001)
					x = 0.00001;
                p.len = x;
                treeLength += x;
				readBrlen = false;
			}
		}
	}
	*/
	//console.log(nodes);
	
	// create tree structure
	for (var i = 0; i < nodes.length; i++) {
		
	}
	
	
	// draw tree using jsPhyloSvg
	var margin = 0.1;
	var divH = document.getElementById("divPhylo").offsetHeight;
	var divW = document.getElementById("divPhylo").offsetWidth;
	var marginH = divH * margin / 2;
	var marginW = divW * margin / 2;
	
	console.log(newickStr);
	this.Data.phylocanvas = new Smits.PhyloCanvas(
		{
			newick: newickStr
		},
		'divPhylo',
		divH,
		divW
	);
};

Phylowood.Data = function() {
};

Phylowood.Node = function() {
	return function(o, parentInstance){
		// initiate object
		this.id = Smits.Common.nodeIdIncrement += 1; // equals states index
		this.level = 0;
		this.len = 0;
		this.time = 0;
		this.ancestor = null;
		this.descendants = [];
//		this.newickLen = 0;
		this.name = '';
		this.type = '';
		this.chart = {};
		this.img = [];
		this.color = [0,0,0];
		
		if(o) Smits.Common.apply(this, o);

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

Phylowood.Tree = function() {
	this.nodes = [];

};

/*

Phylowood.Data.prototype. = function() {
    return 'Title: ' + this.title;
}

var Phylowood = Phylowood || {};

var Phylowood.Data  = function {
    this.tree = null;
    this.geo = null;
    this.data = null;
};






*/
