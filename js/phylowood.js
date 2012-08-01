// namespace
var Phylowood = Phylowood || {};

/***
INPUT
***/

Phylowood.readInputFromHttp = function() {
	this.inputHttp = $( "#textInputHttp" ).attr("value");
	$.get(Phylowood.inputHttp, function(response) {
		//if (Phylowood.inputStr === "")
		Phylowood.inputStr = response;
	})
	.success(function() { })
	.error(function() { })
	.complete(function() { 
		Phylowood.loadInput();
	});
};

Phylowood.loadInput = function() {

	var inputFile = $("#selectDemoData option:selected").val();	
	$('#textareaInput').load(inputFile);

};

Phylowood.reset = function() {

	alert("Phylowood.reset() disabled.\nFor now, refresh your browser to reset.");

	// clear divGeo of polymaps
	this.map = null;

	// clear divPhylo of jsPhyloSvg
	// 	um, .clear() is apparently undefined in the library
	// 	another reason to draw the tree myself
	this.phylocanvas = null;

	// restore divPhylo with textarea and default text

	// restore clock state
};

$( "#selectDemoData" ).change(function() {

	// get current dropdown selection for demo data	
	var inputDemoOption = this.options[this.selectedIndex];

	// load input into text area
	if (inputDemoOption.value !== "nothing") {
		$.get(inputDemoOption.value, function(response) {
			Phylowood.inputStr = response;
		})
		.success(function() { })
		.error(function() { })
		.complete(function() { });
	}
});


/***
INITIALIZE DATA
***/

Phylowood.initialize = function() {
	
	// reset system state
	//this.reset();

	// parse input in inputTextArea
	this.parseInput();

	// initialize data
	this.initStates();
	this.initGeo();
	this.initTree();
	
	// draw from data
	this.initNodeColors();
	this.drawTree();
	this.drawMap();
	
	// draw data by style
	var drawStyle = "force";
	
	if (drawStyle === "pie") {
		this.initMarkersPie();
		this.drawMarkersPie();
	}
	else if (drawStyle === "pack") {
		this.initMarkersPack(); // data layout
		this.drawMarkersPack();
	}
	else if (drawStyle === "force") {
		this.initMarkers();
		this.drawMarkersForce();
		this.initPlayer();
	}
	
};

Phylowood.parseInput = function() {

	// update inputStr from inputTextArea
	this.inputStr = $( "#textareaInput" ).val();
	if (this.inputStr === "") {
		console.log("WARNING: Phylowood.parseInput(): inputStr === \"\"");
		return;
	}
	
	// tokenize inputStr
	var inputTokens = this.inputStr.split(/\r\n|\r|\n/);
		
	// parse inputTokens
	this.treeStr = "";
	this.geoStr = "";
	this.statesStr = "";
	var parseSelect = "";
	
	for (var i = 0; i < inputTokens.length; i++) {
		if (inputTokens[i] === "#GEO")
			parseSelect = "geo";
		else if (inputTokens[i] === "#STATES")
			parseSelect = "states";
		else if (inputTokens[i] === "#TREE")
			parseSelect = "tree";
		else if (parseSelect === "geo")
			this.geoStr += inputTokens[i] + "\n";
		else if (parseSelect === "states")
			this.statesStr += inputTokens[i] + "\n";
		else if (parseSelect === "tree")
			this.treeStr += inputTokens[i] + "\n";
		else
			; // do nothing
	}
	
};

Phylowood.initStates = function() {
	
	// tokenize statesTokens
	var statesTokens = this.statesStr.split("\n");

	// store tokens into taxa and states
	this.taxa = [];
	this.states = [];
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

	this.numNodes = this.states.length;
	this.numTips = (this.numNodes + 1) / 2;
	
	// console.log("Phylowood.initStates():"); console.log(this.taxa); console.log(this.states);
	
};

Phylowood.initGeo = function() {

	// tokensize geoStr
	var geoTokens = this.geoStr.split("\n");

	// assign geoTokens to geoCoords	
	var coordTokens;
	this.geoCoords = [];
	this.maxGeoCoords = [-181.0, -181.0, 181.0, 181.0]; // [N, E, S, W]
	
	// input expects "latitude longitude"
	// maps to [i][0] and [i][1] resp.
	for (var i = 0; i < geoTokens.length; i++) {
		var coordVals = [];
		coordTokens = geoTokens[i].split(" ");
		if (coordTokens.length == 2) {
			// store coordinates
			this.geoCoords.push({"lat":coordTokens[0], "lon":coordTokens[1]});

			// compute maxima for geographical coordinates
			if (this.geoCoords[i].lat > this.maxGeoCoords[0]) // N
				this.maxGeoCoords[0] = this.geoCoords[i].lat;
			if (this.geoCoords[i].lon > this.maxGeoCoords[1]) // E
				this.maxGeoCoords[1] = this.geoCoords[i].lon;
			if (this.geoCoords[i].lat < this.maxGeoCoords[2]) // S
				this.maxGeoCoords[2] = this.geoCoords[i].lat;
			if (this.geoCoords[i].lon < this.maxGeoCoords[3]) // W
				this.maxGeoCoords[4] = this.geoCoords[i].lon;
		}
	}
	
	var numAreas = this.geoCoords.length;
	this.numAreas = numAreas;
	
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
		z += (x.lat - y.lat)^2;
		z += (x.lon - y.lon)^2;
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


Phylowood.initTree = function() {

	// parse Newick string
	var newickStr = this.treeStr;
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

	// assign states to nodes
	for (var i = 0; i < this.numNodes; i++) {
		for (var j = 0; j < this.states.length; j++) {
			if (this.nodes[i].name === this.taxa[j]) {
				this.nodes[i].states = this.states[j];
				this.nodes[i].id = j;
			}
		}
	}

    // this is used to add a "false" branch to the root for phylo controls
    this.rootEnd = 0.0;

	// assign absolute times to nodes, defined as:
	// [t_begin, t_end] = [this.root.timeStart, max(this.nodes[i].timeEnd)]
	var setTime = function(p) {
		if (p.ancestor === null) {
			p.timeStart = 0.0;
			p.timeEnd = Phylowood.rootEnd;
		}
		if (p.ancestor !== null) {
			p.timeEnd = p.len + p.ancestor.timeEnd;
			p.timeStart = p.ancestor.timeEnd;
		}
		for (var i = 0; i < p.descendants.length; i++) {
			setTime(p.descendants[i], p.timeEnd);
		}
	}

    // initialize times to get tree height
	setTime(this.root);
	
	// determine time-based order of nodes (for animation purposes)
	this.nodesByTime = [];
	for (var i = 0; i < this.nodes.length; i++) {
		this.nodesByTime.push(this.nodes[i]);
	}
	this.nodesByTime.sort(function(a,b){return a.timeEnd - b.timeEnd;});

    // reset times with the "false" branch at the root
    this.rootEnd = 0.05 * this.nodesByTime[this.numNodes-1].timeEnd;
    setTime(this.root);

    // get phylo start and end times (treeheight + offset)
	this.startPhyloTime = this.nodesByTime[0].timeStart;
	this.endPhyloTime = this.nodesByTime[this.numNodes-1].timeEnd;

	// postorder traveral nodes (for drawing the tree, F84 pruning, etc.)
	this.nodesPostorder = [this.numNodes];
	var poIdx = 0;

	var downPass = function(p) {
		if (p.descendants.length > 0) {
			for (var i = 0; i < p.descendants.length; i++) {
				downPass(p.descendants[i]);
			}
		}
	//	console.log(poIdx);
		Phylowood.nodesPostorder[poIdx] = p;
		poIdx++;
	}

	downPass(this.root);


	var setHeritageDownPass = function(q, h) {

		// add this node to the heritage
		h.push(q.id);
		
		if (q.descendants.length > 0) {
			// have all immediate descendants do the same
			for (var i = 0; i < q.descendants.length; i++) {
				setHeritageDownPass(q.descendants[i], h);
			}
		}
	}

	var setHeritage = function(p, h) {
		
		var q = p,
		    r = null;

		// find lineage towards root
		if (p.ancestor !== null) {
			r = p;
			while (	r.ancestor !== null) {
				r = r.ancestor;
				p.heritage.push(r.id);
			}
		}
		
		// find clade towards tip
		setHeritageDownPass(p, p.heritage);		

	}
	for (var i = 0; i < this.numNodes; i++)
	{
		var p = this.nodesPostorder[i];
		setHeritage(p);
	}	

	// console.log(newickStr); console.log(newickTokens); console.log(this.nodes); console.log(this.nodesByTime);

};

Phylowood.Node = function() {
	return function(o, parentInstance){
		// initiate object
		this.id = 0; 
		this.level = 0;
		this.len = 0;
		this.timeStart = 0;		
		this.timeEnd = 0;
		this.ancestor = null;
		this.descendants = [];
		this.name = '';
		this.type = '';
		this.chart = {};
		this.img = [];
		this.color = [0,0,0];
		this.states = [];
		this.coord = 0;
		this.heritage = [];
		
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


/***
DRAW
***/


Phylowood.unmaskHeritageForBranch = function(d) {

	// unmask heritage of branch				
	this.treeSvg.selectAll("line").select(
		function(b) {
			//console.log(b);
		
			for (var i = 0; i < d.heritage.length; i++) {
				if (b.id === d.heritage[i]) {
					b.maskHeritage = false;
					return this;
				}
			}
		}
	).style("stroke-opacity", 1.0);	

	// unmask heritage of branch for makers
	d3.selectAll("#divGeo circle.node").select(
		function(m) {
		
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					m.maskHeritage = false;
					return this;
				}
			}

		}
	);//.attr("visibility","visible");
	Phylowood.updateMarkers();
}

Phylowood.maskHeritageForBranch = function(d) {

	// mask heritage of branch
	this.treeSvg.selectAll("line").select(
		function(b) {

			var found = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (b.id === d.heritage[i])
					found = true;
			}
			if (found) {
				b.maskHeritage = true;
				return this;
			}
			else
				return null;
		}
	).style("stroke-opacity", 0.2);

	// mask heritage of branch's markers
	d3.selectAll("#divGeo circle.node").select(
		function(m) {
			
			var found = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					found = true;
				}
			}
			if (found) {
				m.maskHeritage = true;
				return this;
			}
			else
				return null;
		}
	);//.style("visibility", "hidden");
	Phylowood.updateMarkers();
}


Phylowood.highlightHeritageForBranch = function(d) {

	// mask branches not part of heritage
	this.treeSvg.selectAll("line").select(
		function(b) {
			var ancestral = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (b.id === d.heritage[i])
					ancestral = true;
			}
			if (!ancestral) {
				return this;
			}
			else
				return null;
		}
	).style("stroke-opacity", 0.2);

	// mask heritage of branch's markers
	d3.selectAll("#divGeo circle.node").select(
		function(m) {
			
			var ancestral = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					ancestral = true;
				}
			}
			if (!ancestral) {
				return this;
			}
			else
				return null;
		}
	).style("fill-opacity", 0.1);
}

Phylowood.restoreMask = function() {

	// unmask all branches 
	this.treeSvg.selectAll("line").select(
		function(b) {
			if (b.maskHeritage === false)
				return this;
		}
	).style("stroke-opacity", 1.0);

	// unmask all markers
	d3.selectAll("#divGeo circle.node").select(
		function(m) {
			if (m.maskHeritage === false)
				return this;
		}
	).style("fill-opacity", 1.0);
}

Phylowood.drawTree = function() {

	// simply remove for now
	// ...eventually, tie in to .reset()
	// ...mask/unmask or delete/recreate
	$( "#textareaInput" ).remove();
	
	var divH = $("#divPhylo").height(),
		divW = $("#divPhylo").width(),
		unitsH = divH / (this.numTips - 1),
		unitsW = divW / (this.endPhyloTime - this.startPhyloTime);
		
	this.treeSvg = d3.select("#divPhylo")
	                   .append("svg:svg")
	                   .attr("width",divW)
	                   .attr("height",divH);
		
	// format data to JSON
	this.phyloDrawData = [];
	
	// first pass, assigning tips to positions 0, 1, 2, ... 
	var count = 0;
	for (var i = 0; i < this.numNodes; i++) {
	
		// grab node
		var p = this.nodesPostorder[i];
		
		// check if tip and assign if yes
		if (p.descendants.length === 0) {
			p.coord = count;
			count++;
		}
	
	}
	
	// second pass, setting coord based on child nodes
	for (var i = 0; i < this.numNodes; i++) {
		
		// grab node
		var p = this.nodesPostorder[i];	
		
		// parent node is average of child nodes
		if (p.descendants.length > 0) {
			p.coord = 0.0;
			for (var j = 0; j < p.descendants.length; j++)
				p.coord += p.descendants[j].coord;
			p.coord /= p.descendants.length;
		}
		
	}
	
	// third pass, setting branch attributes
	for (var i = 0; i < this.numNodes; i++) {
		
		// grab node and parent node
		var p = this.nodesPostorder[i],
			pp = p.ancestor;
		
		// if parent exists, draw branch
		//if (pp !== null) {

			var c = p.color,
			//	pc = pp.color,		
				xStart = p.timeStart * unitsW,
				xEnd = p.timeEnd * unitsW,
//				yStart = pp.coord * unitsH,
				yEnd = p.coord * unitsH,
				heritage = p.heritage;


			// offset the borders by linewidth
//			if (p.ancestor === null)	xStart += 2;
			if (yEnd == divH) yEnd -= 2;
			if (yStart == divH) yStart -=2;
			if (yStart == 0.0) yStart += 2;
			if (yEnd == 0.0) yEnd +=2;

			// add horizontal lines
			this.phyloDrawData.push({
				"id": p.id,
				"timeStart": p.timeStart,
				"timeEnd": p.timeEnd,
				"x1phy": xStart,
				"x2phy": xEnd,
				"y1phy": yEnd,
				"y2phy": yEnd,
				"color": "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)",
				"maskHeritage": false,
				"heritage": heritage
			});
			
			if (pp !== null) {
				var pc = pp.color,
					yStart = pp.coord * unitsH;
			
				// add vertical lines
				this.phyloDrawData.push({
					"id": p.id,
					"timeStart": p.timeEnd,
					"timeEnd": p.timeEnd,
					"x1phy": xStart,
					"x2phy": xStart,
					"y1phy": yStart,
					"y2phy": yEnd,
					"color": "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)",
					"maskHeritage": false,
					"heritage": heritage
					});
			}
				
	//	}
				
	}
	
	this.treeDrawLines = this.treeSvg.selectAll("line")
				.data(this.phyloDrawData)
				.enter()
				.append("svg:line")
				.attr("x1", function(d) { return d.x1phy; })
				.attr("x2", function(d) { return d.x2phy; })
				.attr("y1", function(d) { return d.y1phy; })
				.attr("y2", function(d) { return d.y2phy; })
				.style("stroke", function(d) { return d.color; })
				.style("stroke-width", 2.5)
				.on("mouseover", function(d) {
					Phylowood.highlightHeritageForBranch(d);
				})
				.on("mouseout", function(d) {
					Phylowood.restoreMask();
				})
				.on("click", function(d) {
					Phylowood.unmaskHeritageForBranch(d);
				})
				.on("dblclick", function(d) {
					Phylowood.maskHeritageForBranch(d);
				});
		
}



Phylowood.initNodeColors = function() {
	
	var lStep = 0.6 / (this.nodesByTime[this.numNodes-1].timeEnd - this.nodesByTime[0].timeEnd);
	var hStep = 300.0 / (this.numTips - 1);

	var lValue = 0.0;
	var hValue = 0.0;

	// assign colors uniformly across tips
	for (var i = 0; i < this.numNodes; i++) {
		if (this.nodes[i].descendants.length === 0) {
			lValue = 1.0 - lStep*this.nodes[i].timeEnd;
			this.nodes[i].color = [hValue, 1, lValue];
			hValue += hStep;
		}
	}

	// set internal nodes based on tip colors
	for (var i = this.numNodes-1; i >= 0; i--) {
		if (this.nodesByTime[i].descendants.length > 0) {

			// get average color of descendants
			var hTemp = 0.0;
			for (var j = 0; j < this.nodesByTime[i].descendants.length; j++) {
				hTemp += this.nodesByTime[i].descendants[j].color[0];
			}
			hTemp /= this.nodesByTime[i].descendants.length;
			lValue = 1.0 - lStep*this.nodesByTime[i].timeEnd;
	
			this.nodesByTime[i].color = [hTemp, 1, lValue];
			
		}
		// console.log(this.nodesByTime[i].color);
	}
}

Phylowood.initMarkers = function() {
	this.markers = [];
//	var showStart = 20;
//	var showOnly = 20;
	var showStart = 0;
	var showOnly = this.numNodes;

	this.showThreshhold = 0.01;
		
	for (var i = showStart; i < showOnly + showStart; i++) {
		var id = this.nodes[i].id;
		var c = this.nodes[i].color;
		var timeStart = this.nodes[i].timeStart;
		var timeEnd = this.nodes[i].timeEnd;

		for (var j = 0; j < this.nodes[i].states.length; j++) {
			if (this.nodes[i].states[j] > this.showThreshhold) {
				this.markers.push({
					"id": id,
					"area": j,
					"val": this.nodes[i].states[j],
					"active": false,
					"timeStart": timeStart,
					"timeEnd": timeEnd,
					"color": "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)",
					"scheduleErase": false,
					"scheduleDraw": false,
					"maskHeritage": false
				});
			}
		}
	}
};

Phylowood.initMarkersPie = function() {
	this.markersPie = [];
	var showStart = 0;
	var showOnly = this.numNodes;
	Phylowood.showThreshhold = 0.05;
	
	// for each time
//	for (var i = 0; i < this.nodesByTime.length; i++)

	// for each divergence event in the tree, plus the root)
	for (var i = 0; i < (this.numNodes - this.numTips + 1); i++)
	{
		this.markersPie[i] = [];
		
		// time lineage i exists
		t_i_0 = this.nodesByTime[i].timeStart;
		t_i_f = this.nodesByTime[i].timeEnd;
		//console.log(this.nodesByTime[i].id, t_i_0, t_i_f);

		// for each area
		for (var j = 0; j < this.nodesByTime[i].states.length; j++)
		{
			this.markersPie[i][j] = [];
			var val = [];
			var color = [];
			var ancestor = [];
	
			// for each lineage
			for (var k = 0; k < this.nodesByTime.length; k++)
			{


				// time lineage k exists
				t_k_0 = this.nodesByTime[k].timeStart;
				t_k_f = this.nodesByTime[k].timeEnd;
				
				// posterior probability
				var v = this.nodesByTime[k].states[j];
				
				//console.log(t_i_0,t_i_f,t_k_0,t_k_f,v);				
				// if the pp is less than threshhold
				if (v === 0.0)
					;
				else if (v < Phylowood.showThreshhold)
					v = 0.0;
				// do nothing if lineages coexist
				else if (t_i_0 === t_k_0 && t_i_f === t_k_f)
					;
				else if (t_i_f > t_k_0 && t_i_f <= t_k_f)
					;
				// ... but, if lineages i and k do not coexist temporally
				else
					v = 0.0;
				// consider making v an interpolated value over branch length
				// ...

				//console.log(v);

				// add to vals
				val[k] = v;
				var c = this.nodesByTime[k].color;
				color[k] = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";
				ancestor[k] = (this.nodesByTime[k].ancestor !== null ? this.nodesByTime[k].ancestor.id : -1);
			}
			// add the JSON data
			//console.log(i, j, val)
			var ts = this.nodesByTime[i].timeStart;
			var te = this.nodesByTime[i].timeEnd;
			
			this.markersPie[i][j] = {
				"area": j,
                "lat": Phylowood.geoCoords[j].lat,
                "lon": Phylowood.geoCoords[j].lon,
				"val": val,
                "sumVal": eval(val.join("+")),
				"active": false,
				"timeStart": ts,
				"timeEnd": te,
				"color": color,
				"ancestor": ancestor,
				"scheduleErase": false,
				"scheduleDraw": false,
				"maskHeritage": false
			};
		}
	}
};

Phylowood.initMarkersPack = function() {
	this.markersPack = [];
	var showStart = 0;
	var showOnly = this.numNodes;
	this.showThreshhold = 0.05;
	
	// for each time
//	for (var i = 0; i < this.nodesByTime.length; i++)

	// for each divergence event in the tree, plus the root)
	for (var i = 0; i < (this.numNodes - this.numTips + 1); i++)
	{
		this.markersPack[i] = [];
		
		// time lineage i exists
		t_i_0 = this.nodesByTime[i].timeStart;
		t_i_f = this.nodesByTime[i].timeEnd;
		//console.log(this.nodesByTime[i].id, t_i_0, t_i_f);

		// for each area
		for (var j = 0; j < this.nodesByTime[i].states.length; j++)
		{
			this.markersPack[i][j] = [];
			var val = [];
			var color = [];
			var ancestor = [];
			var descendants = [];
	
			// for each lineage
			for (var k = 0; k < this.nodesByTime.length; k++)
			{
				// time lineage k exists
				t_k_0 = this.nodesByTime[k].timeStart;
				t_k_f = this.nodesByTime[k].timeEnd;
				//console.log(this.nodesByTime[k].id, t_k_0, t_k_f);
				
				// posterior probability
				var v = this.nodesByTime[k].states[j];
				
				// if the pp is less than threshhold
				if (v < this.showThreshhold)
					v = 0.0;
				// lineage i always coexists with itself
				else if (i === k)
					; 
				// ... but, if lineages i and k do not coexist temporally
				else if (t_i_0 >= t_k_f || t_i_f <= t_k_0)
					v = 0.0;
				// consider making v an interpolated value over branch length
				// ...
				
				// WARNING: overwrite v for testing
				v = 1.0;

				// add to vals
				val[k] = v;
				var c = this.nodesByTime[k].color;
				color[k] = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";
				ancestor[k] = this.nodesByTime.ancestor;
				descendants[k] = this.nodesByTime.descendants[k];
				
			}
			// add the JSON data
			//console.log(i, j, val)
			var ts = this.nodesByTime[i].timeStart;
			var te = this.nodesByTime[i].timeEnd;
			
			this.markersPack[i][j] = {
				"area": j,
				"val": val,
                "sumVal": eval(val.join("+")),
				"active": false,
				"timeStart": ts,
				"timeEnd": te,
				"color": color,
				"ancestor": ancestor,
				"descendants": descendants,
				"scheduleErase": false,
				"scheduleDraw": false,
				"maskHeritage": false
			};
		}
	}
};

Phylowood.drawMap = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;

	// toy data
	var states = this.markers; //this.initMarkers();
	var coords = this.geoCoords;
	var foci = [coords.length]; // cluster foci, i.e. areas lat,lons

	// find center and extent of coords
	var meanLat = 0,
		meanLon = 0,
		minLat = 90,
		maxLat = -90,
		minLon = 180,
		maxLon = -180;
	for (var i = 0; i < coords.length; i++) {
	
		// latitude
		var lat = parseFloat(coords[i].lat);
		meanLat += lat;
		if (lat < minLat) { minLat = lat; }
		if (lat > maxLat) { maxLat = lat; }
	
		// longitude
		var lon = parseFloat(coords[i].lon);	
		if (lon < minLon) { minLon = lon; }
		if (lon > maxLon) { maxLon = lon; }		
		// convert to 0 to 360
		if (lon < 0) { lon = 360 + lon; }
		meanLon += lon;	
		
	}
	meanLat /= coords.length;
	meanLon /= coords.length;
	// convert back to -180 to 180
	if (meanLon > 180) {
		meanLon = meanLon - 360
	}
		
	// create polymaps object
	var po = org.polymaps;
	this.po = po;
	
	// create the map object, add it to #divGeo
	var map = po.map()
		.container(d3.select("#divGeo").append("svg:svg").node())
		.center({lat:meanLat,lon:meanLon})
		.zoom(15)
		.add(po.interact())
		.add(po.image()
		  .url(po.url("http://{S}tile.cloudmade.com"
		  + "/5b7ebc9342d84da7b27ca499a238df9d" // http://cloudmade.com/register
		  + "/999/256/{Z}/{X}/{Y}.png")
//		  + "/44979/256/{Z}/{X}/{Y}.png")
// 		  + "/998/256/{Z}/{X}/{Y}.png")
		  .hosts(["a.", "b.", "c.", ""])))
		.add(po.compass().pan("none"));
	this.map = map;
	

	// zoom out to fit all the foci	
	// need to center map at {0,0} when zoom is 1 to put entire globe in view
    var autoZoomSize = 0.1;
	while (minLat < map.extent()[0].lat) { 
		map.zoomBy(-autoZoomSize); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20}) }
	}
	while (minLon < map.extent()[0].lon) { 
		map.zoomBy(-autoZoomSize); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20}) }		
	}	
	while (maxLat > map.extent()[1].lat) { 
		map.zoomBy(-autoZoomSize); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20}) }		
	}	
	while (maxLon > map.extent()[1].lon) { 
		map.zoomBy(-autoZoomSize); 
		if (map.zoom() <= 2) { map.center({lat:20,lon:20}) }		
	}

	this.bestZoom = map.zoom();	
		
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");
};

Phylowood.drawMarkersForce = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;


	// geo data
	var states = this.markers; //this.initMarkers();
	var coords = this.geoCoords;
	var foci = [coords.length]; // cluster foci, i.e. areas lat,lons
	
	
	// assign foci xy coordinates from geographical coordinates
	for (var i = 0; i < coords.length; i++)
		foci[i] = this.map.locationPoint(coords[i]);	

	// create force layout
	this.force = d3.layout.force()
		.nodes(states)
		.links([])
	//	.charge( function(d) { return -Math.pow(Math.pow( map.zoom() / Phylowood.bestZoom, 2) * d.val * 3, 2.0) / 8; } )
		.charge( function(d) { return -Math.pow(Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 2) * d.val * 4, 2.2); } )
		.gravity(0.0)
		.theta(1.5)
		.friction(0.9)
		//.alpha(100000)
		.size([w, h])
		;
		
	states.forEach(function(d, i) {
		d.x = foci[d.area].x;
		d.y = foci[d.area].y;
	});

	this.force.start();
	
	// create svg markers
	var layer = d3.select("#divGeo svg")
	var node = layer.selectAll("circle.node")
			.data(states)
		.enter().append("svg:circle")
			.attr("class","node")
			.attr("cx", function(d) { return foci[d.area].x; })
			.attr("cy", function(d) { return foci[d.area].y; })
//			.attr("r",  function(d) { return 3 * Math.sqrt(d.val); })
			.attr("r",  function(d) { return Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 3) * d.val * 2; })
		//	.attr("r", function(d) { return d.val * 2; })
			.attr("fill", function(d) { return d.color; })
		//	.attr("stroke", "white")
			.attr("stroke-width", 1)
			.attr("fill-opacity", 1)
			.attr("visibility","hidden")
			;

	// freeze markers during pan & zoom
	d3.select("#divGeo")
		.on("mousedown", mousedown)
		.on("mouseup", mouseup);
		
	function mousedown() {
		Phylowood.force.stop();
	}
	
	function mouseup() {
		// disabled to suppress d3.layout.pack "boioioing"-iness
		//force.resume();
	}

	// update coordinates when map pans and zooms
	this.map.on("move", function() {

		Phylowood.force.stop();
		// update force properties with each move
		//force.charge( -1.5 * map.zoom());
		//force.gravity(0.0);
		//Phylowood.force.charge( function(d) { return -Math.pow(Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 2) * d.val * 4, 2.2); } )
	//	Phylowood.force.charge( function(d) { return -20; } );
		// better visualization: have all nodes retain actual positions, instead of refocusing
		// it seems like areas contract at different zoom levels... weird
		// update positions of js states[] objects
		
		states.forEach(function(o,i) {
			xy = Phylowood.map.locationPoint({"lon": o.lon, "lat":o.lat});
			o.x = xy.x;
			o.y = xy.y; 
		});
		
		// update positions and radii for nodes
		node.attr("cx", function(d) { return d.x; })
		    .attr("cy", function(d) { return d.y; })
		    .attr("r", function(d) { return  Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 3) * d.val * 2; }) // change vs. zoom??


		// update force foci positions
		for (var i = 0; i < coords.length; i++)
			foci[i] = Phylowood.map.locationPoint(coords[i]);
		
	//	force.resume();

	});	


	// update node[] each tick
	this.force.on("tick", function(e) {

		// set stepsize per tick
		var k = e.alpha * 5;

		// update object values per tick
		states.forEach(function(o,i) {
			o.x += (foci[o.area].x - o.x) * k
			o.y += (foci[o.area].y - o.y) * k
			var latlon = Phylowood.map.pointLocation({"x": o.x, "y": o.y});
			o.lon = latlon.lon;
			o.lat = latlon.lat;
		});

		// update object attributes per tick
		layer.selectAll("circle.node")
		     .attr("cx", function(d) { return d.x; })
		     .attr("cy", function(d) { return d.y; });
		
	});
	
};

Phylowood.drawMarkersPie = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;
		
	// assign foci xy coordinates from geographical coordinates
	var foci = []; // cluster foci, i.e. areas lat,lons
	for (var i = 0; i < Phylowood.geoCoords.length; i++)
		foci[i] = Phylowood.map.locationPoint(Phylowood.geoCoords[i]);	

	// draw each pie
	function bakepie(classname, data, x, y, r)
	{
		var arc = d3.svg.arc()
		    .startAngle(function(d) { return d.startAngle; } )
	        .endAngle(function(d) { return d.endAngle; } )
	        .innerRadius(function(d,i) { 
			    if (data.val[i] === 0.0) return r;
			    else return Math.pow(1.0 - data.val[i], 2) * r; 
		    })
	        .outerRadius(r);

		var pie = d3.select("#divGeo svg")
            .append("svg:g")
                .data([data.val.map(Math.ceil)]) // works 
                // need to use the d3.fn() that reindexes data
                // if I use .sort(), then .data is indexed differently
                /*
                .data([data.ancestor.sort(function(a,b) {
            		z = 0;
					if (a.ancestor === b.ancestor) z++;
				//	if (a.ancestor === b.id) z++;
					return z;
                })].map(function(d,i){
					return Math.ceil(data.val[i]);
                }))*/
                .attr("class", classname);

		var donut = d3.layout.pie();

		var arcs = pie.selectAll("g.arc")
            .data(donut)
          .enter().append("svg:g")
            .attr("class", "arc")
            .attr("transform", "translate(" + x + "," + y + ")");

        var paths = arcs.append("svg:path")
            .attr("fill", function(d, i) { return data.color[i]; })
            .attr("d", arc)
            .attr("class", "marker")
		    //.attr("d", function() { return  arc; });

   		Phylowood.donut = donut;
		Phylowood.arc = arc;
		Phylowood.pie = pie;
		Phylowood.arcs = arcs;
		Phylowood.paths = paths;
    }
	
	var numPies = Phylowood.markersPie[0].length;
	//var numTimes = Phylowood.markersPie.length;
    var numTimes = 3;
	var t = 2;
	for (; t < numTimes; t++)
	{
	    for (i = 0; i < numPies; i++)
	    {
            bakepie("pie" + i, Phylowood.markersPie[t][i], foci[i].x, foci[i].y, 5);
    	}
	}
    
    // update coordinates when map pans and zooms
	this.map.on("move", function() {

		var na = Phylowood.numAreas;
		var p = d3.selectAll("#divGeo svg path")[0];

		// update force foci positions
		for (var i = 0; i < Phylowood.numAreas; i++) {
			foci[i] = Phylowood.map.locationPoint(Phylowood.geoCoords[i]);
			
			for (var j = 0; j < Phylowood.numNodes; j++) {
				p[i * na + j].attr("transform", "translate(" + foci[i].x + "," + foci[i].y + ")");
			}
		}

		
		// attempted to assign each path its corresponding area
		// 	this could be used to translate the path to a new location

		// also, need to rescale the innerradius/outerradius w/r/t map.zoom()
		// 	I think this may require redrawing the paths, since the paths
		// 	are relatively complicated strings...

/*
		d3.selectAll("#divGeo svg path")
			.attr("transform", function(d,i) {
				console.log(d.area);
				//return "translate(" + foci[d.area].x + "," + foci[d.area].y + ")";
				return "translate(" + foci[d.area].x + "," + foci[d.area].y + ")";
			});
*/
	});	    
};

	
Phylowood.drawMarkersPack = function() {
	
	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;
		
	// assign foci xy coordinates from geographical coordinates
	var foci = []; // cluster foci, i.e. areas lat,lons
	for (var i = 0; i < Phylowood.geoCoords.length; i++)
		foci[i] = Phylowood.map.locationPoint(Phylowood.geoCoords[i]);	
	
	var t = 0;
	var numPacks = Phylowood.markersPack[0].length;
	for (i = 0; i < numPacks; i++)
	{
		var data = Phylowood.markersPack[t][i];
		var r = data.val.join("+"); // 
    	makePack("pack" + i, data, foci[i].x, foci[i].y, data.val.join("+") * 20);
    }	
};


/***
CONTROLS
***/

Phylowood.initPlayer = function() {

	this.ticker = ""; // setInterval() object

	this.curPhyloTime = this.startPhyloTime;

	this.startClockTime = 0.0;
	this.endClockTime = 30000.0; // play for 30 seconds, by default
	this.curClockTime = 0.0;
	this.clockTick = 100.0;
	this.phyloTick = 0.0;
	this.phyloTick = (this.endPhyloTime - this.curPhyloTime) / this.clockTick;

	this.playSpeed = 1.0;
	
	$( "#divSlider" ).slider("option","max",this.endPhyloTime)
		.slider("option","min",this.startPhyloTime)
		.slider("option","value",this.curPhyloTime)
		.slider("option","step", .1)
		.slider({ animate: true });

	this.treeSvg.append("svg:line")
		.data([{"id": -1}])
		.attr("id", "phyloSlider")
		.attr("x1", 0)
		.attr("x2", 0)
		.attr("y1", 0)
		.attr("y2", $( "#divPhylo" ).height())
		.style("stroke", "black")
		.style("stroke-width", 2)
		.style("stroke-dasharray", 2, 10)
		.style("stroke-opacity", .5)
		.call(d3.behavior.drag()
    		.on("drag", function(d) {     			
    			Phylowood.drag(d3.event.dx)
    		}) );
    		
	
	this.phyloTimeToPxScale = d3.scale.linear()
					.domain([this.startPhyloTime, this.endPhyloTime])
					.range([0, $( "#divPhylo" ).width()]);
					
	this.pxToPhyloTimeScale = d3.scale.linear()
					.domain([0, $( "#divPhylo" ).width()])
					.range([this.startPhyloTime, this.endPhyloTime]);					
								
	this.phyloToClockTimeScale = d3.scale.linear();
	this.clockToPhyloTimeScale = d3.scale.linear();
	this.playerLoaded = true;
	
	this.startDisplay();
	
	// show current year
	// add tick marks for divergence events	
	// if time allows
	// function maximizeDisplay() {};
	// function minimizeDisplay() {};

};

// drag time by delta x pixels
Phylowood.drag = function(dx) {
	this.curPhyloTime += Phylowood.pxToPhyloTimeScale(dx); 
	this.sliderBusy = true;
	this.updateDisplay();
}


Phylowood.animStart = function() {


	if (this.playSpeed < 0.0)
		this.animPause();
	this.playSpeed = 1.0;
	
	this.curPhyloTime = this.startPhyloTime;
	this.curClockTime = this.startClockTime;
	var pos = Phylowood.phyloTimeToPxScale(Phylowood.curPhyloTime);
	$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
	$( "#divSlider" ).slider("option","value",this.startPhyloTime);

	this.startDisplay();
	//d3.select("#divGeo").selectAll("circle.node").remove();
}

Phylowood.animEnd = function() {
	
	if (this.playSpeed > 0.0)
		this.animPause();
		
	this.playSpeed = 1.0;
	
	this.curPhyloTime = this.endPhyloTime;
	this.curClockTime = this.endClockTime;
	var pos = Phylowood.phyloTimeToPxScale(Phylowood.curPhyloTime);
	$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
	$( "#divSlider" ).slider("option","value",this.endPhyloTime);
	clearInterval(this.ticker);
	this.endDisplay();
}

Phylowood.animRewind = function() {

	if (this.playSpeed === 1.0)
		this.playSpeed = -1.0;

	else if (this.playSpeed < 0.0 && this.playSpeed >= -8.0)
		this.playSpeed *= 2.0;

	else if (this.playSpeed > 1.0)
		this.playSpeed /= 2.0;
}

Phylowood.animFfwd = function() {

	if (this.playSpeed === -1.0)
		this.playSpeed = 1.0;

	else if (this.playSpeed > 0.0 && this.playSpeed <= 8.0)
		this.playSpeed *= 2.0;

	else if (this.playSpeed < -1.0)
		this.playSpeed /= 2.0;
}

Phylowood.animPause = function() {
	clearInterval(this.ticker);
}

Phylowood.animPlay = function() {

	if (typeof this.playSpeed !== "undefined") {
		// update display each clockTick
		this.ticker = setInterval(this.updateDisplay, this.clockTick * this.playSpeed); 
	}
}

Phylowood.animStop = function() {
	clearInterval(Phylowood.ticker);
	this.playSpeed = 1.0;
	this.animStart();
}

Phylowood.slideSlider = function() {

//	this.animPause();

	this.curPhyloTime = $( "#divSlider" ).slider("option","value");
	var pos = Phylowood.phyloTimeToPxScale(Phylowood.curPhyloTime);
	$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
	this.sliderBusy = true;
	this.updateDisplay();
}

Phylowood.changeSlider = function() {
	
	if (typeof this.sliderBusy !== "undefined") {
		this.curPhyloTime = $( "#divSlider" ).slider("option","value");
		var pos = Phylowood.phyloTimeToPxScale(Phylowood.curPhyloTime);
		$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
		
		if (Phylowood.curPhyloTime == Phylowood.startPhyloTime) {
			Phylowood.startDisplay();
		}
		else if (Phylowood.curPhyloTime == Phylowood.endPhyloTime) {
			Phylowood.endDisplay();
		}
	}
	this.sliderBusy = false;
}



Phylowood.startDisplay = function() {

	// get animation state for all lineages
	for (var i = 0; i < Phylowood.markers.length; i++) {
		var m = Phylowood.markers[i];
		if (m.timeStart == 0.0 && m.timeEnd == 0.0) {
			if (m.scheduleDraw === false && m.maskHeritage == false)
				m.scheduleDraw = true;
		}
		// can probably just use an "else"
		else {
			if (m.scheduleErase === false)
				m.scheduleErase = true;
		}
	}
	
	// enter() and remove() events according to .curPhyloTime and nodes[].animateOn values
	// remove()
	d3.selectAll("#divGeo circle.node").select(
		function(d) {
			if (d.scheduleErase === true) {
				d.scheduleErase = false;
				return this;
			}
			else {
				return null;
			}
		}).attr("visibility","hidden");

	d3.select("#divGeo svg").selectAll("circle.node")
		.data(Phylowood.markers).select(
		function(d) {
			if (d.scheduleDraw === true) {
				d.scheduleDraw = false;
				return this;
			}
			else {
				return null;
			}
		}).attr("visibility","visible");
	
}

Phylowood.endDisplay = function() {

	// get animation state for all lineages
	for (var i = 0; i < Phylowood.markers.length; i++) {
		var m = Phylowood.markers[i];
		if (m.timeEnd == Phylowood.endPhyloTime) {
			if (m.scheduleDraw === false && m.maskHeritage == false)
				m.scheduleDraw = true;
		}
		// can probably just use an "else"
		else {
			if (m.scheduleErase === false)
				m.scheduleErase = true;
		}
	}
	
	// enter() and remove() events according to .curPhyloTime and nodes[].animateOn values
	// remove()
	d3.selectAll("#divGeo circle.node").select(
		function(d) {
			if (d.scheduleErase === true) {
				d.scheduleErase = false;
				return this;
			}
			else {
				return null;
			}
		}).attr("visibility","hidden");

	d3.select("#divGeo svg").selectAll("circle.node")
		.data(Phylowood.markers).select(
		function(d) {
			if (d.scheduleDraw === true) {
				d.scheduleDraw = false;
				return this;
			}
			else {
				return null;
			}
		}).attr("visibility","visible");

}

Phylowood.updateDisplay = function() {

	//console.log("t_c=" + Phylowood.curClockTime + ", t_p=" + Phylowood.curPhyloTime);

	// update current times
	if (Phylowood.sliderBusy === false) {
		Phylowood.curPhyloTime = Phylowood.curPhyloTime + Phylowood.phyloTick * Phylowood.playSpeed;
		Phylowood.curClockTime = Phylowood.curClockTime + Phylowood.clockTick * Phylowood.playSpeed;
	}
	
	// stop if animation duration met
	if (Phylowood.curPhyloTime <= Phylowood.startPhyloTime)
		Phylowood.animStart();
	else if (Phylowood.curPhyloTime >= Phylowood.endPhyloTime)
		Phylowood.animEnd();	


	// update slider position
	//if (Phylowood.sliderBusy === false) {
		var pos = Phylowood.phyloTimeToPxScale(Phylowood.curPhyloTime);
		$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
		$( "#divSlider" ).slider("option","value", Phylowood.curPhyloTime);
		
	//}
	
	Phylowood.updateMarkers();


	
	// enter() and remove() events according to .curPhyloTime and nodes[].animateOn values
	// remove()
	
}

Phylowood.updateMarkers = function() {

	// get animation state for all lineages
	for (var i = 0; i < Phylowood.markers.length; i++) {
		var m = Phylowood.markers[i];

		// branch active, general case
		if (m.timeStart < Phylowood.curPhyloTime && m.timeEnd >= Phylowood.curPhyloTime && m.maskHeritage == false) {
			m.scheduleDraw = true;
		}
		// branch active, border cases
		else if (m.timeStart == 0.0 && m.timeEnd == 0.0 && Phylowood.curPhyloTime == 0.0 && m.maskHeritage == false) {
			m.scheduleDraw = true;
		}
		// branch not active
		else if (m.timeStart >= Phylowood.curPhyloTime || m.timeEnd < Phylowood.curPhyloTime || m.maskHeritage == true) {
			m.scheduleErase = true;
		}
	}

	d3.selectAll("#divGeo circle.node").select(
		function(d) {
			if (d.scheduleErase === true) {
				d.scheduleErase = false;
				return this;
			}
			else {
				return null;
			}
		}).attr("visibility","hidden");

	d3.select("#divGeo svg").selectAll("circle.node")
		.data(Phylowood.markers).select(
		function(d) {
			if (d.scheduleDraw === true) {
				d.scheduleDraw = false;
				return this;
			}
			else {
				return null;
			}
		}).attr("visibility","visible");
}
/***
DEFUNCT
***/
/*
// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
  ; // All the File APIs are supported.
} else {
  alert('The File APIs are not fully supported in this browser.');
}

// Store file contents to Phylowood.infile
function handleFileSelect(evt) {
//	Phylowood.infile = "";
	var f;
	f = evt.target.files[0];
	var fr = new FileReader();

	fr.onload = function(e) {
		
		//var txtArea = document.createElement('textarea');
		//txtArea.value = this.result;
		//document.getElementById('divGeo').appendChild(txtArea);
		
		Phylowood.inputStr = this.result;
		// console.log("inputFile.result = " + this.result);
	};
	fr.onerror = function(e) {
		//alert("error");
	};
	fr.readAsText(f);
}
document.getElementById('files').addEventListener('change', handleFileSelect, false);
*/

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

Phylowood.testMultiFocus = function () {
	this.initMap();
};

Phylowood.testSelect = function() {
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");
	layer.selectAll("circle.node")
		.select(function(d,i) { return i > 3 ? d : null; });// { return d.id > 3 ? this : null; })
		//.remove();
};

