// namespace
var Phylowood = Phylowood || {};

/***
FILE HANDLING
***/
// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  ; // All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

// Store file contents to Phylowood.infile
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
		Phylowood.infile = this.result;
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

Phylowood.initialize = function() {
	this.parseInput(this.infile);
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
	
	this.taxa = [];
	this.states = [];
	
	var statesTokens = statesStr.split("\n");
	var taxonTokens;
	
	for (var i = 0; i < statesTokens.length; i++) {
		taxonTokens = statesTokens[i].split(" ");
		if (taxonTokens.length > 1) {
			this.taxa.push(taxonTokens[0]);
			var taxonVals = [];
			for (var j = 1; j < taxonTokens.length; j++) {
				taxonVals.push(parseFloat(taxonTokens[j]));
			}
			this.states.push(taxonVals);
		}
	}
	
	/*
	console.log("Phylowood.initStates():");
	console.log(this.taxa);
	console.log(this.states);
	*/
	
};

Phylowood.initGeo = function(geoStr) {
	
	// parse string for geoCoords
	this.geoCoords = [];
	
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
			this.geoCoords.push(coordVals);
			
			// compute maxima for geographical coordinates
			if (this.geoCoords[i][0] > maxN)
				maxN = this.geoCoords[i][0];
			if (this.geoCoords[i][0] < maxS)
				maxS = this.geoCoords[i][0];
			if (this.geoCoords[i][1] > maxE)
				maxE = this.geoCoords[i][1];
			if (this.geoCoords[i][1] < maxW)
				maxW = this.geoCoords[i][1];
		}
	}
	
	var numAreas = this.geoCoords.length;
	
	// construct distance matrix geoDistances
	this.distanceType = "Euclidean";
	this.geoDistances = [];
	for (var i = 0; i < numAreas; i++) {
		var distanceVals = [];
		for (var j = 0; j < numAreas; j++) {
			if (i === j) {
				distanceVals.push(0.0);
			}
			else {
				distanceVals.push( Phylowood.distance(
					this.geoCoords[i],
					this.geoCoords[j]));
			}
		}
		this.geoDistances.push(distanceVals);
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
	this.divCoords = [];
	for (var i = 0; i < numAreas; i++) {
		var coordVals = [];
		coordVals.push( (-this.geoCoords[i][0] + maxN) * (1.0 - geoMarginH) / geoScaleH * divH + divMarginH);
		coordVals.push( (this.geoCoords[i][1] - maxW) * (1.0 - geoMarginW) / geoScaleW * divW + divMarginW);
		this.divCoords.push(coordVals);
	}

	// load map
	// ... dynamically, via OpenLayers
	// Phylowood.testOpenLayers();
	
	// ... dynamically, via Polymaps
	// Phylowood.testPolyMaps();
	
	// ... statically, via createElement and filepath
	var imageFile = "./phylowood.default.jpg";
	var geoImage = document.createElement("IMG");
	geoImage.src = imageFile;
	document.getElementById("divGeo").appendChild(geoImage);
	

	/*
	console.log("Phylowood.initGeo():");
	console.log(this.geoCoords);
	console.log(this.divCoords);
	console.log(this.geoDistances);
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
	
	// construct Tree from newickTokens	
	this.nodes = [];
	this.root = null;
	var p = null;

	readBrlen = false;
	
	for (var i = 0; i < newickTokens.length; i++) {
		
		// indicates new node
		if ( newickTokens[i] === "(" ) {

			if (p === null) {
				p = new Phylowood.Node;
				this.nodes.push(p);
				this.root = p;
			}
			else {
				var q = new Phylowood.Node;
				q.ancestor = p;
				this.nodes.push(q);
				p.descendants.push(q);
				p = q;
			}
			readBrlen = false;
		}
		
		// indicates end of clade
		else if ( newickTokens[i] === ")" ) {
            if (p.ancestor !== null) {
            	p = p.ancestor;
            }
            else {
                console.log("Phylowood.initTree(): Problem going down tree");
            }
			readBrlen = false;
		}
		
		// indicates divergence event
		else if ( newickTokens[i] === "," ) {
            if (p.ancestor !== null) {
                p = p.ancestor;
            }
            else {
                console.log("Phylowood.initTree(): Problem going down tree");
            }
			readBrlen = false;
		}
		
		// next token is branch length
		else if ( newickTokens[i] === ":" )
		{
			readBrlen = true;
		}
		
		// no tokens (should) remain
		else if ( newickTokens[i] === ";" ) {
			; // do nothing
		}
		else {
			// taxon name token
			if (readBrlen === false) {
        		var tipName = newickTokens[i];
        		var tipIdx = -1;
        		for (var j = 0; j < this.taxa.length; j++) {
        			if (tipName === this.taxa[j]) {
        				tipIdx = j;
        				break;
        			}
        		}
        		if (tipIdx === -1) {
        			console.log("Phylowood.initTree(): Could not find " + tipName + " in Phylowood.taxa");
        		}
        		
        		// internal node
        		if (newickTokens[i-1] === ")") {
        			p.id = tipIdx;
        			p.name = tipName;
        		}
        		
        		// tip node
        		else {
					var q = new Phylowood.Node;
					q.id = tipIdx;
					q.ancestor = p;
					q.name = tipName;
					this.nodes.push(q);
					p.descendants.push(q);
					p = q;
				}
			}
			
			// branch length token
			else {
				// reading a branch length 
				var x = parseFloat(newickTokens[i]);
				if (x < 0.00001)
					x = 0.00001;
                p.len = x;
				readBrlen = false;
			}
		}
	}

	
	// assign absolute times to nodes, defined as:
	// [t_begin, t_end] = [this.root.time, max(this.nodes[i].time)]
	var setTime = function(p) {
		if (p.ancestor !== null)
			p.time = p.len + p.ancestor.time;
		for (var i = 0; i < p.descendants.length; i++) {
			setTime(p.descendants[i], p.time);
		}
	}
	setTime(this.root);

	
	// determine time-based order of nodes (for animation purposes)
	this.nodesByTime = [];
	for (var i = 0; i < this.nodes.length; i++) {
		this.nodesByTime.push(this.nodes[i]);
	}
	this.nodesByTime.sort(function(a,b){return a.time - b.time;});
	

	// draw tree using jsPhyloSvg
	var margin = 0.1;
	var divH = document.getElementById("divPhylo").offsetHeight;
	var divW = document.getElementById("divPhylo").offsetWidth;
	var marginH = divH * margin / 2;
	var marginW = divW * margin / 2;
	
	this.phylocanvas = new Smits.PhyloCanvas(
		{
			newick: newickStr
		},
		'divPhylo',
		divH,
		divW
	);

/*
	console.log(newickStr);
	console.log(newickTokens);
	console.log(this.nodes);	
	console.log(this.nodesByTime);
*/
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
	this.this.nodes = [];

};


/***
TESTING
***/


Phylowood.testOpenLayers = function() {
	this.olmap = new OpenLayers.Map("divGeo", {
		size: new OpenLayers.Size( { w:200, h:200 } ),
		controls: [
			new OpenLayers.Control.Navigation(),
			new OpenLayers.Control.ArgParser(),
			new OpenLayers.Control.Attribution()
		]
	});
	
	var numControl = this.olmap.controls.length;
	for (var i = 0; i < numControl; i++) {
		this.olmap.controls[0].deactivate();
		this.olmap.removeControl(this.olmap.controls[0]);
	}
	
	this.olwms = new OpenLayers.Layer.WMS( "OpenLayers WMS", 
                                            "http://labs.metacarta.com/wms/vmap0?", 
                                            {'layers': 'basic'},
                                            {'minExtent': new OpenLayers.Bounds(-1,-1,1,1),
                                             'maxExtent': new OpenLayers.Bounds(-122.2,38.0,-122.1,38.2),
                                             //'maxExtent': new OpenLayers.Bounds(-100,-100,100,100),
                                             'minResolution': "auto",
                                             'maxResolution': "auto"});

    this.olmap.addLayer(this.olwms);
    var div = OpenLayers.Util.getElement("divGeo");
    div.style.width = 600 + "px";
    div.style.height = 600 + "px";
    /*
	var exportMapControl = new OpenLayers.Control.ExportMap();
	this.olmap.addControl(exportMapControl);
	this.olmap.addControl(new OpenLayers.Control.LayerSwitcher());
	this.olmap.zoomToExtent(new OpenLayers.Bounds(-11.8296875, 39.54021484375, 10.6703125, 50.79021484375));
	var olmapCanvas = OpenLayers.Util.getElement("exportedImage");
	exportMapControl.trigger(olmapCanvas);
	OpenLayers.Util.getElement("downloadLink").href = canvas.toDataURL();
	*/

	// render the map at defined zoom
	this.olmap.zoomToMaxExtent();
};

Phylowood.testPolyMaps = function() {

	// reformat Phylowood data into this JSON-like format
	// expects input as ...
	var d1 = 
		[
			{"id": "A", "val": 1.0, "coords": [-121.08, 38.17], "color": "red"},
			{"id": "A", "val": 1.0, "coords": [-121.18, 38.05], "color": "red"},
			{"id": "A", "val": 1.0, "coords": [-121.13, 38.11], "color": "red"},
			{"id": "B", "val": 1.0, "coords": [-122.08, 38.17], "color": "yellow"},
			{"id": "B", "val": 1.0, "coords": [-122.18, 38.05], "color": "yellow"},
			{"id": "B", "val": 1.0, "coords": [-122.13, 38.11], "color": "yellow"},
			{"id": "C", "val": 1.0, "coords": [-123.08, 38.17], "color": "blue"},
			{"id": "C", "val": 1.0, "coords": [-123.18, 38.05], "color": "blue"},
			{"id": "C", "val": 1.0, "coords": [-123.13, 38.11], "color": "blue"}
		];

	// create polymaps object
	var po = org.polymaps;
	
	// Create the map object, add it to #map…
	var map = po.map()
		.container(d3.select("#divGeo").append("svg:svg").node())
		.center({lat: 38.1, lon: -122.15})
		.zoom(8)
		//.centerRange([{lat: 38.2, lon: -122.1}, {lat: 38.0, lon: -122.2}])
		.add(po.interact());
		
	map.add(po.image()
		.url(po.url("http://{S}tile.cloudmade.com"
		+ "/87d72d27ad3a48939015cdbd06980326" // http://cloudmade.com/register
		+ "/2/256/{Z}/{X}/{Y}.png")
		.hosts(["a.", "b.", "c.", ""])));
		
	map.add(po.compass()
		.pan("none"));
    
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");
	
	function transform(d) {
    	d = map.locationPoint({lon: d.coords[0], lat: d.coords[1]});
		return "translate(" + d.x + "," + d.y + ")";
	}
	
	// update marker positions when map moves
	map.on("move", function() {
		layer.selectAll("g").attr("transform", transform);
    });
    
	var marker = layer.selectAll("g")
		.data(d1)
		.enter()
		.append("svg:g")
		.attr("transform", transform);
	
	// add a circle
	marker.append("svg:circle")
		.attr("r", function(d) { return d.val * 5.0; })
		.style("fill", function(d){ return d.color; });
	
};

Phylowood.testMultiFocus = function() {

	// toy data
	var states = [
		{"id":0, "area":0, "val":.3, "color":"red"},
		{"id":0, "area":2, "val":.7, "color":"red"},
		{"id":1, "area":0, "val":.4, "color":"yellow"},
		{"id":1, "area":1, "val":.2, "color":"yellow"},
		{"id":1, "area":2, "val":.4, "color":"yellow"},
		{"id":2, "area":1, "val":.5, "color":"blue"},
		{"id":2, "area":2, "val":.5, "color":"blue"}
	];

	// create polymaps object
	var po = org.polymaps;
	
	// Create the map object, add it to #map…
	var map = po.map()
		.container(d3.select("#divGeo").append("svg:svg").node())
//		.center({lat: 38.1, lon: -122.15})
		.center({lat:38,lon:-123})
		.zoom(10)
		//.centerRange([{lat: 38.2, lon: -122.1}, {lat: 38.0, lon: -122.2}])
		.add(po.interact());
		
	map.add(po.image()
		.url(po.url("http://{S}tile.cloudmade.com"
		+ "/87d72d27ad3a48939015cdbd06980326" // http://cloudmade.com/register
		+ "/62438/256/{Z}/{X}/{Y}.png")
		.hosts(["a.", "b.", "c.", ""])));
		
	map.add(po.compass()
		.pan("none"));
		
	function transform(d) {
    	d = map.locationPoint({lon: d.coords[0], lat: d.coords[1]});
		return "translate(" + d.x + "," + d.y + ")";
	}
	
	// update marker positions when map moves
	map.on("move", function() {
		layer.selectAll("g").attr("transform", transform);
		//console.log(map.locationPoint(coords[0]));
		// need to update loci when map moves
		for (var i = 0; i < coords.length; i++) { foci[i] = map.locationPoint(coords[i]); }
    });

	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");

	var w = 600,
		h = 600,
		fill = d3.scale.category10(),
		nodes = [],
		coords = [{lon:-123.08, lat:38.17}, {lon:-123.18, lat:38.05}, {lon:-123.13, lat:38.11}],
		foci = [coords.length];
	
	// convert to div coordinates
	for (var i = 0; i < coords.length; i++) { foci[i] = map.locationPoint(coords[i]); }

	// define force layout
	var force = d3.layout.force()
		.nodes(nodes)
		.links([])
		//.linkDistance(1)
		//.linkStrength(1)
		.friction(.95)
		.charge(-5)
		.gravity(0.0)
		.size([w, h]);
	
	force.on("tick", function(e) {
	  // Push nodes toward their designated focus.
	  var k = .1 * e.alpha;
	  nodes.forEach(function(o, i) {
		o.y += (foci[o.area].y - o.y) * k;
		o.x += (foci[o.area].x - o.x) * k;
	  });
	
	  layer.selectAll("circle.node")
		  .attr("cx", function(d) { return d.x; })
		  .attr("cy", function(d) { return d.y; });
	});
	
	
	for (var i = 0; i < states.length; i++) {

		// can assign unique id for branch & area (to do later)
		nodes.push( states[i] );
	
		layer.selectAll("circle.node")
			.data(nodes)
		.enter().append("svg:circle")
			.attr("class", "node")
			.attr("cx", function(d) { return foci[d.area].x; })
			.attr("cy", function(d) { return foci[d.area].y; })
			.attr("r", function(d) { return 10 * Math.pow(d.val,0.5); })
			.style("fill", function(d) { return fill(d.color); })
//			.style("stroke", function(d) { return d3.rgb(fill(d.id)).darker(2); })
			.style("stroke-width", 1.5)
//			.attr("transform", transform)
			.call(force.drag);
	}
	
	force.start();
	
};

//Phylowood.testPolyMaps();