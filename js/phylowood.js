// namespace
var Phylowood = Phylowood || {};
var phw = Phylowood; // shortname

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

	// initialize raw data
    this.initSettings();
	this.initStates();
	this.initGeo();
	this.initTree();
	
	// draw from data
	this.initNodeColors();
	this.drawTree();
	this.drawMap();
	
    // initialize animation data
    this.initAnimationData();

    if (this.modelType === "phylogeography"
        && this.areaType === "continuous")
    {
        this.drawMarkersContinuous();
    }
    else if (this.drawType === "pie"
        && this.areaType === "discrete")
    {
        this.drawMarkersDiscretePie();
    }

    this.initPlayer();
    this.initFilter();
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
        if (inputTokens[i] === "#SETTINGS")
            parseSelect = "settings";
		else if (inputTokens[i] === "#GEO")
			parseSelect = "geo";
		else if (inputTokens[i] === "#STATES")
			parseSelect = "states";
		else if (inputTokens[i] === "#TREE")
			parseSelect = "tree";
        else if (parseSelect === "settings")
            this.settingsStr += inputTokens[i] + "\n";
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

Phylowood.initSettings = function() {
    
    // tokenize settingsTokens
    var settingsTokens;
    if (typeof this.settingsStr !== "undefined") {
        settingsTokens = this.settingsStr.split("\n");

        // assign phylowood settings
        for (var i = 0; i < settingsTokens.length; i++) {
            var s = settingsTokens[i].split(" ");
            if (s[0] === "drawtype")
                Phylowood.drawType = s[1];
            else if (s[0] === "modeltype")
                Phylowood.modelType = s[1];
            else if (s[0] === "areatype")
                Phylowood.areaType = s[1];
            else if (s[0] === "piestyle")
                Phylowood.pieStyle = s[1];
        }
    }
};

Phylowood.initStates = function() {
	
	// tokenize statesTokens
	var statesTokens = this.statesStr.split("\n");

    // threshhold to mask small values
    this.showThreshhold = 0.05;

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
                var v = parseFloat(taxonTokens[j]);
                if (v < this.showThreshhold)
                    v = 0.0;
				taxonVals.push(v);
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
	this.nodesByTime
                    .sort(function(a,b){return a.timeEnd - b.timeEnd;})
                    .sort(function(a,b){return a.timeStart - b.timeStart;});

    // reset times with the "false" branch at the root
    this.rootEnd = 0.05 * this.nodesByTime[this.numNodes-1].timeEnd;
    this.root.len = this.rootEnd;
    setTime(this.root);

    // get phylo start and end times (treeheight + offset)
	this.startPhyloTime = this.nodesByTime[0].timeStart;
	this.endPhyloTime = this.nodesByTime[this.numNodes-1].timeEnd;
    for (var i = 0; i < this.numNodes; i++)
    {
        if (this.nodes[i].descendants.length === 0) { 
            var t = this.nodes[i].timeEnd;
            if (t > this.endPhyloTime)
                this.endPhyloTime = t;
        }
    }

    // assign treeLength
    this.treeLength = 0.0;
    for (var i = 0 ; i < this.numNodes; i++)
        this.treeLength += this.nodes[i].len;

    // assign treeHeight
    this.treeHeight = this.endPhyloTime - this.startPhyloTime;

    // clockticks when divergence events occur (populated later in animationData)
    this.divergenceTicks = [];
    this.divergenceTickIdx = 0;

    // assign clock and phylo time units
	this.curPhyloTime = this.startPhyloTime;
	this.startClockTime = 0.0;
	this.endClockTime = 60000.0; // animation lasts 30s
	if (this.areaType === "continuous")
        this.clockTick = 100.0; // update per .1s
    else if (this.areaType === "discrete")
        this.clockTick = 200.0;
    else
        this.clockTick = 1000.0;
	this.phyloTick = 0.0;
	this.phyloTick = (this.endPhyloTime - this.curPhyloTime) * (this.clockTick / this.endClockTime);
    this.numClockTicks = Math.ceil(this.endClockTime / this.clockTick) + 1;
    this.curClockTick = 0;

	// array of nodes by postorder traversal (for drawing the tree, F84 pruning, etc.)
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

    // array of nodes by id
    this.nodesById = [];
    for (var i = 0; i < this.numNodes; i++)
        this.nodesById[this.nodes[i].id] = this.nodes[i];

	var setContinuumDownPass = function(q, h) {

		// add this node to the heritage
		h.push(q.id);
		
		if (q.descendants.length > 0) {
			// have all immediate descendants do the same
			for (var i = 0; i < q.descendants.length; i++) {
				setContinuumDownPass(q.descendants[i], h);
			}
		}
	}

	var setContinuum = function(p, h) {
		
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
		setContinuumDownPass(p, p.heritage);		

	}
	for (var i = 0; i < this.numNodes; i++)
	{
		var p = this.nodesPostorder[i];
		setContinuum(p);
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

Phylowood.unmaskContinuumForBranch = function(d) {

    Phylowood.forceRedraw = true;

	// unmask heritage of branch				
	this.treeSvg.selectAll("line").select(
		function(b) {
			//console.log(b);
		
			for (var i = 0; i < d.heritage.length; i++) {
				if (b.id === d.heritage[i]) {
					b.maskContinuum = false;
					return this;
				}
			}
		}
	).style("stroke-opacity", 1.0);	

	// unmask heritage of branch for markers
	d3.selectAll("#divGeo .marker").select(
		function(m) {
		
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					m.maskContinuum = false;
					return this;
				}
                else if (typeof m.data !== "undefined")
                {
                    if (m.data.id === d.heritage[i]) {
                        m.data.maskContinuum = false;
                        return this;
                    }
                }
			}

		}
	);//.attr("visibility","visible");
	Phylowood.updateMarkers();
}

Phylowood.maskContinuumForBranch = function(d) {

    Phylowood.forceRedraw = true;

	// mask heritage of branch
	this.treeSvg.selectAll("line").select(
		function(b) {

			var found = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (b.id === d.heritage[i])
					found = true;
			}
			if (found) {
				b.maskContinuum = true;
				return this;
			}
			else
				return null;
		}
	).style("stroke-opacity", 0.2);

	// mask heritage of branch's markers
	d3.selectAll("#divGeo .marker").select(
		function(m) {
			
			var found = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					found = true;
				}
                else if (typeof m.data !== "undefined")
                {
                    if (m.data.id === d.heritage[i])
                        found = true;
                }
			}
			if (found) {
                if (typeof m.maskContinuum !== "undefined")
				    m.maskContinuum = true;
                else if (typeof m.data !== "undefined")
                {
                    if (typeof m.data.maskContinuum !== "undefined")
                        m.data.maskContinuum = true;
                }
				return this;
			}
			else
				return null;
		}
	);//.style("visibility", "hidden");
	Phylowood.updateMarkers();
}


Phylowood.highlightContinuumForBranch = function(d) {

    Phylowood.forceRedraw = true;

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
	).style("stroke-opacity", 0.1);

	// mask heritage of branch's markers
	d3.selectAll("#divGeo .marker").select(
		function(m) {
			
			var ancestral = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					ancestral = true;
				}
                else if (typeof m.data !== "undefined")
                {
                    if (m.data.id === d.heritage[i])
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
	
    // mask heritage of branch's tracers
	d3.selectAll("#divGeo .tracer").select(
		function(m) {
			
			var ancestral = false;
			for (var i = 0; i < d.heritage.length; i++) {
				if (m.id === d.heritage[i]) {
					ancestral = true;
				}
                else if (typeof m.data !== "undefined")
                {
                    if (m.data.id === d.heritage[i])
                        ancestral = true;
                }
			}
			if (!ancestral) {
				return this;
			}
			else
				return null;
		}
	).style("stroke-opacity", 0.1);

    // display lineage information
    d3.selectAll("#divPhylo svg").append("svg:text")
        .text(function() { return d.name; })
        .attr("x", function() { return d.x2phy + 5; })
        .attr("y", function() { return d.y2phy - 5; })
        .attr("transform", function() {
            return "rotate(270 " + d.x2phy + "," + d.y2phy + ")";
        })
        .attr("dy", function() {
            return 0;
        /*
            var bbox = this.getBBox();
            var h = bbox.height;
            var x = bbox.x;
            if (x - h < 0) return x - h;
        */
        })
        .attr("dx", function() {
            var bbox = this.getBBox();
            var w = bbox.width;
            var y = bbox.y;
            if (y - w < 0) return -w-10;
        })
        .style("fill", function() { return d.color; })

    this.svgFilter.append("svg:text")
        .text(function() { return d.name; })
        .attr("x", 160)
        .attr("y", 40)
        .attr("class","info")
        .style("fill","white");

    this.svgFilter.append("svg:text")
        .text(function() { return d.id; })
        .attr("x", 160)
        .attr("y", 20)
        .attr("class","info")
        .style("fill","white");

    this.svgFilter.append("svg:text")
        .text(function() { return d.timeStart; })
        .attr("x", 160)
        .attr("y", 60)
        .attr("class","info")
        .style("fill","white");
    
    this.svgFilter.append("svg:text")
        .text(function() { return d.timeEnd; })
        .attr("x", 160)
        .attr("y", 80)
        .attr("class","info")
        .style("fill","white");
}

Phylowood.restoreMask = function() {

    Phylowood.forceRedraw = true;

	// unmask all branches 
	this.treeSvg.selectAll("line").select(
		function(b) {
			if (b.maskContinuum === false)
				return this;
		}
	).style("stroke-opacity", 1.0);

	// unmask all markers
	d3.selectAll("#divGeo .marker").select(
		function(m) {
			if (m.maskContinuum === false)
				return this;
            else if (typeof m.data !== "undefined")
            {
                if (m.data.maskContinuum === false)
                    return this;
            }
		}
	).style("fill-opacity", 1.0);
	
    // unmask all tracers
	d3.selectAll("#divGeo .tracer").select(
		function(m) {
			if (m.maskContinuum === false)
				return this;
            else if (typeof m.data !== "undefined")
            {
                if (m.data.maskContinuum === false)
                    return this;
            }
		}
	).style("stroke-opacity", 1.0);

    // erase lineage information
    d3.selectAll("#divPhylo svg text").remove();
    this.svgFilter.selectAll(".info").remove();
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
				heritage = p.heritage,
                name = p.name;

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
				"maskContinuum": false,
				"heritage": heritage,
                "name": name
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
					"maskContinuum": false,
					"heritage": heritage,
                    "name": name
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
					Phylowood.highlightContinuumForBranch(d);
				})
				.on("mouseout", function(d) {
					Phylowood.restoreMask();
				})
				.on("click", function(d) {
					Phylowood.unmaskContinuumForBranch(d);
				})
				.on("dblclick", function(d) {
					Phylowood.maskContinuumForBranch(d);
				});
}

Phylowood.initNodeColors = function() {
	
	var lStep = 0.6 / this.treeHeight; //(this.nodesByTime[this.numNodes-1].timeEnd - this.nodesByTime[0].timeStart);
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
	}
}

Phylowood.initAnimationData = function() {

    // animation data structure for generic drawType
	this.animationData = [];
    
    // animation path strings for drawType==="pie"
    this.animationPathStr = [];

    // discrete areas: values change, coordinates constant
    if (this.areaType === "discrete")
    {
        // for each area
        for (var j = 0; j < this.numAreas; j++)
        {
            this.animationData[j] = [];

            // pre-compute basic lineage information
            var val = [];
            var tClockStart = [],
                tClockEnd = [],
                tClockDuration = [],
                startClockIdx = [],
                endClockIdx = [],
                numClockIdx = [],
                color = [],
                vTick = [];


            // can speed up code by rearranging for loops (most of this is independent of j;
            //     the reset can be placed in the per-lineage loop below)
            for (var i = 0; i < this.numNodes; i++)
            {
                // get the node and its ancestor (or if it is the root, itself)
                var p = this.nodesPostorder[i];
                var q = p.ancestor || p;
                //val[i] = 0;
                val[i] = p.states[j];

                // time lineage i exists
                tClockStart[i]  = (p.timeStart / this.treeHeight) * this.endClockTime;
                tClockEnd[i] = (p.timeEnd / this.treeHeight) * this.endClockTime;
                tClockDuration[i] = tClockEnd[i] - tClockStart[i];
                startClockIdx[i] = Math.ceil(tClockStart[i] / this.clockTick);
                endClockIdx[i] = Math.ceil(tClockEnd[i] / this.clockTick);
                numClockIdx[i] = endClockIdx[i] - startClockIdx[i] + 1;
                
                // vals and vTicks 
                vTick[i] = (q.states[j] - p.states[j]) / numClockIdx[i];
                //console.log(val[i], p.states[j]);

                // lineage colors
                var c = p.color;
                color[i] = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";

                // populate divergenceTicks[]
                this.divergenceTicks.push(startClockIdx[i]);
            }
            
            // use jQuery to gather array of unique divergence times
            // used for animation of discrete pie
            this.divergenceTicks = $.unique(this.divergenceTicks).reverse();

            // UNEXPECTED BEHAVIOR
            // console.log() DOES NOT report val correctly to Google Chrome
            // alert() has no problem.
            // alert(val);
            // console.log(val);

            // for each lineage (i indexes nodesPostorder)
            for (var i = 0; i < this.numNodes; i++)
            {
                var saveV = false; 
                var v = [];
                var show = [];

                // for each tick in [startClockIdx,endClockIdx] 
                for (var k = this.numClockTicks; k >= 0; --k)
           //     for (var k = 0; k < this.numClockTicks; k++)
                {
                    // get current value and tick size
                    if (k >= startClockIdx[i] && k < endClockIdx[i])
                    {
                        v[k] = val[i];
                        show[k] = 1;
//                        if (val[i] > 0)
                            saveV = true;
                        val[i] += vTick[i];
                    }
                    else if (k === endClockIdx[i] && k === this.numClockTicks - 1)
                    {
                        saveV = true;
                        show[k] = 1;
                        v[k] = val[i];
                    }
                    else if (k < startClockIdx[i] || k >= endClockIdx[i])
                    {
                        show[k] = 0;
                    }
                    //else
                        //valArray[k][i] = 0;
                }
                // console.log(valArray[k]);
                if (saveV === true)
                {
                    x = {
                        "id": this.nodesPostorder[i].id,
                        "area": j,
                        "val": v,
                        "show": show,
                        "coord": {"lat":this.geoCoords[j].lat, "lon":this.geoCoords[j].lon},
                        "color": color[i],
                        "startClockTick": startClockIdx[i],
                        "endClockTick": endClockIdx[i],
                        "maskContinuum": false
                    };
                    // console.log(j,i,x);
                    this.animationData[j].push(x);
                }
            }
        }
    }

    else if (this.areaType === "discrete2")
    {
        // for each area
        for (var j = 0; j < this.numAreas; j++)
        {
            this.animationData[j] = [];
            this.animationPathStr[j] = [];

            // pre-compute basic lineage information
            var val = [];
            var tClockStart = [],
                tClockEnd = [],
                tClockDuration = [],
                startClockIdx = [],
                endClockIdx = [],
                numClockIdx = [],
                color = [],
                vTick = [];


            for (var i = 0; i < this.numNodes; i++)
            {
                // get the node and its ancestor (or if it is the root, itself)
                var p = this.nodesPostorder[i];
                var q = p.ancestor || p;
                //val[i] = 0;

                // time lineage i exists
                tClockStart[i]  = (p.timeStart / this.treeHeight) * this.endClockTime;
                tClockEnd[i] = (p.timeEnd / this.treeHeight) * this.endClockTime;
                tClockDuration[i] = tClockEnd[i] - tClockStart[i];
                startClockIdx[i] = Math.ceil(tClockStart[i] / this.clockTick);
                endClockIdx[i] = Math.ceil(tClockEnd[i] / this.clockTick);
                numClockIdx[i] = endClockIdx[i] - startClockIdx[i] + 1;
                
                // lineage colors
                var c = p.color;
                color[i] = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";

                // populate divergenceTicks[]
                this.divergenceTicks.push(startClockIdx[i]);

                // vals and vTicks 
                val[i] = p.states[j];
                vTick[i] = (q.states[j] - p.states[j]) / numClockIdx[i];
                //console.log(val[i], p.states[j]);

            }
            
            // use jQuery to gather array of unique divergence times
            // used for animation of discrete pie
            this.divergenceTicks = $.unique(this.divergenceTicks).reverse();

            // UNEXPECTED BEHAVIOR
            // console.log() DOES NOT report val correctly to Google Chrome
            // alert() has no problem.
            // alert(val);
            // console.log(val);

            // for each lineage (i indexes nodesPostorder)
            for (var i = 0; i < this.numNodes; i++)
            {
                var saveV = false; 
                var v = [];
                var show = [];

                // for each tick in [startClockIdx,endClockIdx] 
                for (var k = this.numClockTicks; k >= 0; --k)
           //     for (var k = 0; k < this.numClockTicks; k++)
                {
                    // get current value and tick size
                    if (k >= startClockIdx[i] && k < endClockIdx[i])
                    {
                        v[k] = val[i];
                        show[k] = 1;
//                        if (val[i] > 0)
                            saveV = true;
                        val[i] += vTick[i];
                    }
                    else if (k === endClockIdx[i] && k === this.numClockTicks - 1)
                    {
                        saveV = true;
                        show[k] = 1;
                        v[k] = val[i];
                    }
                    else if (k < startClockIdx[i] || k >= endClockIdx[i])
                    {
                        show[k] = 0;
                    }
                    //else
                        //valArray[k][i] = 0;
                }
                // console.log(valArray[k]);
                if (saveV === true)
                {
                    x = {
                        "id": this.nodesPostorder[i].id,
                        "area": j,
                        "val": v,
                        "show": show,
                        "coord": {"lat":this.geoCoords[j].lat, "lon":this.geoCoords[j].lon},
                        "color": color[i],
                        "startClockTick": startClockIdx[i],
                        "endClockTick": endClockIdx[i],
                        "maskContinuum": false
                    };
                    // console.log(j,i,x);
                    this.animationData[j].push(x);
                }
            }
        }
    }
    // continuous areas: coordinates change, values constant
    // marker per lineage, interpolated values
    else if (this.areaType === "continuous")
    {
        // for each lineage, postorder
        for (var i = 0; i < this.numNodes; i++)
        {
            // get the node and its ancestor (or if it is the root, itself)
            var p = this.nodesPostorder[i];
            var q = p.ancestor || p;
            // console.log(p.id,q.id);
            
            // time lineage i exists
            var tClockStart = (p.timeStart / this.treeHeight) * this.endClockTime;
            var tClockEnd = (p.timeEnd / this.treeHeight) * this.endClockTime;
            var tClockDuration = tClockEnd - tClockStart;
            var startClockIdx = Math.ceil(tClockStart / this.clockTick);
            var endClockIdx = Math.ceil(tClockEnd / this.clockTick);
            var numClockIdx = endClockIdx - startClockIdx;// + 1;

            // lineage values
            var c = p.color;
            var color = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";


            // find the currently and ancestrally occupied areas
            var ancAreaIdx = -1;
            var curAreaIdx = -1;

            for (var j = 0; j < this.numAreas; j++) {
                if (q.states[j] > 0.0)
                    ancAreaIdx = j;
                if (p.states[j] > 0.0) 
                    curAreaIdx = j;
            }

            // get current value and tick size
            var lat = parseFloat(this.geoCoords[curAreaIdx].lat);
            var lon = parseFloat(this.geoCoords[curAreaIdx].lon);
            var ancLat = parseFloat(this.geoCoords[ancAreaIdx].lat);
            var ancLon = parseFloat(this.geoCoords[ancAreaIdx].lon);
            var latTick = (ancLat - lat) / numClockIdx;
            var lonTick = (ancLon - lon) / numClockIdx;
            var val = 1.0;

            var latArray = [];
            var lonArray = [];
            var coordArray = [];

            // interpolate coordinates, constant values
            for (var k = this.numClockTicks; k >= 0; --k)
            {
                if (k === endClockIdx)
                {
                    coordArray[k] = {"lat":String(lat), "lon":String(lon)};
                }
                else if (k >= startClockIdx && k < endClockIdx)
                {
                    lat += latTick;
                    lon += lonTick;
                    coordArray[k] = {
                        "lat":String(lat),
                        "lon":String(lon)
                    };
                }
                /*
                */
            }
            this.animationData.push({
                "id": p.id,
                "val": val,
                "coord": coordArray,
                "color": color,
                "startClockTick": startClockIdx,
                "endClockTick": endClockIdx,
                "maskContinuum": false
            });
        }
	}
};

Phylowood.drawMarkersContinuous = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;

	// geo data
	var data = this.animationData; //this.initMarkers();
	var coords = this.geoCoords;
	var foci = [];
	
	// assign foci xy coordinates from geographical coordinates
	for (var i = 0; i < coords.length; i++)
		foci[i] = this.map.locationPoint(coords[i]);

    // add xy coordinates to markers
    data.forEach(function(d) {
        d.x = [];
        d.y = [];
        for (var i = 0; i < Phylowood.numClockTicks; i++)
        {
            if (typeof d.coord[i] !== "undefined")
            {
                xy = Phylowood.map.locationPoint(d.coord[i]);
                d.x[i] = xy.x;
                d.y[i] = xy.y;
            }
        }
    });

    // draw circle markers
    var layer = d3.select("#divGeo svg");
    this.node = layer.selectAll("circle.marker")
        .data(data)
      .enter().append("svg:circle")
        .attr("class","marker")
        .attr("cx", function(d) { return d.x[d.startClockTick]; })
        .attr("cy", function(d) { return d.y[d.startClockTick]; })
        .attr("r", function(d) {
                return Math.pow(Phylowood.map.zoom() / Phylowood.bestZoom, 4) * d.val * 3;
        })
        .attr("fill", function(d) { return d.color })
        .attr("stroke-width", 1)
        .attr("fill-opacity", 1)
        .attr("visibility", function(d) {
            if (d.startClockTick <= Phylowood.curTick && d.endClockTick >= Phylowood.curTick)
                return "visible";
            else
                return "hidden";
        });

    // draw lines
    this.nodelines = layer.selectAll("line.tracer")
        .data(data)
      .enter().append("svg:line")
        .attr("class","tracer")
        .attr("x1", function(d) { return d.x[d.startClockTick]; })
        .attr("y1", function(d) { return d.y[d.startClockTick]; })
        .attr("x2", function(d) { return d.x[d.startClockTick]; })
        .attr("y2", function(d) { return d.y[d.startClockTick]; })
        .attr("stroke", function(d) { return d.color; })
        .style("stroke-width", function() {
            return Math.pow(Phylowood.map.zoom() / Phylowood.bestZoom, 4) * 2;
        });
    
    // rescale continuous markers if the map perspective changes
	this.map.on("move", function() {

		// get new map-to-pixel coordinates for all states
        data.forEach(function(d) {
            d.x = [];
            d.y = [];
            for (var i = 0; i < Phylowood.numClockTicks; i++)
            {
                if (typeof d.coord[i] !== "undefined")
                {
                    xy = Phylowood.map.locationPoint(d.coord[i]);
                    d.x[i] = xy.x;
                    d.y[i] = xy.y;
                }
            }
        });
		
		// update positions and radii for nodes
		Phylowood.node
            .attr("cx", function(d) { 
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.x[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.x[d.endClockTick];
                else
                    return d.x[Phylowood.curClockTick];
            })
            .attr("cy", function(d) {
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.y[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.y[d.endClockTick];
                else
                    return d.y[Phylowood.curClockTick];
            })
		    .attr("r", function(d) {
                return  Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * d.val * 3;
            });

        Phylowood.nodelines
            .attr("x1", function(d) { return d.x[d.startClockTick]; })
            .attr("y1", function(d) { return d.y[d.startClockTick]; })
            .attr("x2", function(d) {
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.x[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.x[d.endClockTick];
                else
                    return d.x[Phylowood.curClockTick];
            })
            .attr("y2", function(d) {
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.y[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.y[d.endClockTick];
                else
                    return d.y[Phylowood.curClockTick];
            })
            .style("stroke-width", function() {
                return Math.pow(Phylowood.map.zoom() / Phylowood.bestZoom, 4) * 2;
            });
	});	
}

Phylowood.drawMarkersDiscretePie = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;
    var r = 15;

	// geo data
	var data = this.animationData;
	var coords = this.geoCoords;
	var foci = [];
	
	// assign foci xy coordinates from geographical coordinates
	for (var i = 0; i < coords.length; i++)
    {
		foci[i] = this.map.locationPoint(coords[i]);

        // add xy coordinates to markers
        data[i].forEach(function(d)
        {
            if (typeof d !== "undefined")
            {
                xy = Phylowood.map.locationPoint(d.coord);
                d.x = xy.x;
                d.y = xy.y;
            }
        });
    }

    // pie chart variables
    // initializiation
    this.arc = d3.svg.arc()
        .startAngle(function(d) { return d.startAngle; })
        .endAngle(function(d) { return d.endAngle; })
        .innerRadius(function(d) { 
            return Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * r *(1 - d.data.val[Phylowood.curClockTick]);
        })
        .outerRadius(function(d) {
            return Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * r;
        });

    // animation
    this.arc2 = d3.svg.arc()
        .startAngle(function(d) { return d.startAngle; })
        .endAngle(function(d) { return d.endAngle; })
        .innerRadius(function(d) { return d.innerRadius; })
        .outerRadius(function(d) { return d.outerRadius; });

    // construct pie charts
    this.pie = []; 
    //this.donut = [];
    this.arcs = [];
    this.paths = [];

    this.donut = d3.layout.pie().sort(null).value(function(d) {
        if (typeof d.val[Phylowood.curClockTick] !== "undefined")
        {
            //console.log(d);
            if (d.maskContinuum === false) 
            {
                if (Phylowood.pieStyle === "full")
                    return Math.ceil(d.val[Phylowood.curClockTick]);
                else if (Phylowood.pieStyle === "even")
                    return 1;
            }
            //else if (d.maskContinuum === true)
            //    console.log(d);
        }
        //return null;
        return 0;
    });

    /*
    this.donut2 = d3.layout.pie().sort(null).value(function(d) {
        if (typeof d.val[Phylowood.curClockTick] !== "undefined")
        {
            if (d.val[Phylowood.curClockTick] !== 0.0
                && d.startClockIdx >= Phylowood.curClockTick
                && d.endClockIdx <= Phylowood.curClockTick)
            {
                return Math.ceil(d.val[Phylowood.curClockTick]);
            }
        }
        //return null;
        return 0;
    });*/

    for (var i = 0; i < this.numAreas; i++) //this.numAreas; i++)
    {
        if (this.animationData[i].length !== 0)
        {
            this.pie[i] = d3.selectAll("#divGeo svg") 
                .append("svg:g")
                .attr("class", "pie" + i);

            // center arcs at foci
            this.arcs[i] = this.pie[i].selectAll("g.arc")
                .data(Phylowood.donut(data[i]))
              .enter().append("svg:g")
                .attr("class","arc" + i)
                .attr("transform", function(d) {
                    return "translate(" + d.data.x + "," + d.data.y + ")";
                });

            // draw paths according to this.arc
            this.paths[i] = this.arcs[i].append("svg:path")
                .attr("fill", function(d) { return d.data.color; })
                .attr("d", Phylowood.arc)
                .attr("class", "marker");
        }
    }

    // rescale discrete pie markers if the map perspective changes
	this.map.on("move", function() {

		// get new map-to-pixel coordinates for all states
        for (var i = 0; i < Phylowood.numAreas; i++)
        {
            if (Phylowood.animationData[i].length !== 0)
            {
                Phylowood.pie[i].selectAll("g").attr("transform", function(d) {
                    if (typeof d !== "undefined") {
                        xy = Phylowood.map.locationPoint(d.data.coord);
                        d.data.x = xy.x;
                        d.data.y = xy.y;
                        //console.log(d);
                        return "translate(" + d.data.x + "," + d.data.y + ")"; 
                    }
                })

                // adjust for zoom
                //var x = d3.selectAll(".pie" + i + " path");
                //x.attr("d", Phylowood.arc);
                Phylowood.arcs[i].attr("d", Phylowood.arc);
            }
        }
    });
}

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
    var autoZoomSize = 0.25;
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
   
    this.prevZoom = map.zoom();
    this.zoomPauseAnimation = false;
    
    Phylowood.dragPauseAnimation = false;
    $("#divGeo").mousedown(function() {
        Phylowood.dragPauseAnimation = true;
	});
	
	$("#divGeo").mouseup(function() {
        Phylowood.dragPauseAnimation = false;
	});
		
	var layer = d3.select("#divGeo svg").insert("svg:g", ".compass");

    this.maxLat = maxLat;
    this.minLat = minLat;
    this.maxLon = maxLon;
    this.minLon = minLon;
    this.areaDensity = (maxLat - minLat) * (maxLon- minLon) / coords.length;
};

/***
CONTROLS
***/

Phylowood.initPlayer = function() {

	this.ticker = ""; // setInterval() object

	this.playSpeed = 1.0;
    this.playTick = 1.0;
    this.forceRedraw = false;
	
	$( "#divSlider" ).slider("option", "max", this.numClockTicks)
		.slider("option", "min", 0)
		.slider("option", "value", 0)
		.slider("option", "step",  1)
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
		.style("stroke-opacity", .7)
		.call(d3.behavior.drag()
    		.on("drag", function(d) {     			
    			Phylowood.drag(d3.event.dx)
    		}) );

    // scales to convert between ticks and pixels for phyloSlider
	this.tickToPxScale = d3.scale.linear()
					.domain([0, this.numClockTicks])
					.range([0, $( "#divPhylo" ).width()]);
					
	this.pxToTickScale = d3.scale.linear()
					.domain([0, $( "#divPhylo" ).width()])
					.range([0, this.numClockTicks]);					

	this.playerLoaded = true;
	
	// show current year
	// add tick marks for divergence events	

};

// drag time by delta x pixels for the phyloSlider line
Phylowood.drag = function(dx) {
	this.curClockTick += Phylowood.pxToTickScale(dx); 
	this.sliderBusy = true;
	this.updateDisplay();
}

Phylowood.animStart = function() {

	if (this.playForward === -1.0)
    {
		this.animPause();
    }

	this.playSpeed = 1.0;
	
	this.curClockTick = 0;
	var pos = this.tickToPxScale(Phylowood.curClockTick);
	$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
	$( "#divSlider" ).slider("option", "value", 0);

}

Phylowood.animEnd = function() {
	
	if (this.playForward === 1.0)
    {
		this.animPause();
    }

	this.playSpeed = 1.0;
	
	this.curClockTick = this.numClockTicks;
	var pos = this.tickToPxScale(this.numClockTicks); 
	$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
	$( "#divSlider" ).slider("option","value",this.numClockTicks);
}

Phylowood.animRewind = function() {

	if (this.playTick === 1.0 && this.playSpeed === 1.0)
		this.playTick = -1.0;
    if (this.playTick === 1.0 && this.playSpeed > 1.0)
		this.playSpeed /= 2.0;
	else if (this.playTick === -1.0 && this.playSpeed >= 1.0 && this.playSpeed <= 8.0)
		this.playSpeed *= 2.0;

    // reset interval
    clearInterval(Phylowood.ticker);
    Phylowood.animPlay();
}

Phylowood.animFfwd = function() {

	if (this.playTick === -1.0 && this.playSpeed === 1.0)
		this.playTick = 1.0;
    if (this.playTick === -1.0 && this.playSpeed > 1.0)
		this.playSpeed /= 2.0;
	else if (this.playTick === 1.0 && this.playSpeed >= 1.0 && this.playSpeed <= 8.0)
		this.playSpeed *= 2.0;

    // reset interval
    clearInterval(Phylowood.ticker);
    Phylowood.animPlay();
}

Phylowood.animPause = function() {
	clearInterval(this.ticker);
}

Phylowood.animPlay = function() {

    if (this.playerLoaded === true) {
		this.ticker = setInterval(this.updateDisplay, this.clockTick / this.playSpeed); 
	}
}

Phylowood.animStop = function() {
	clearInterval(Phylowood.ticker);
	this.playSpeed = 1.0;
    this.playTick = 1.0;
	this.animStart();
}

Phylowood.slideSlider = function() {

	this.curClockTick = $( "#divSlider" ).slider("option","value");
	var pos = Phylowood.tickToPxScale(Phylowood.curClockTick);
	$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
	this.sliderBusy = true;
	this.updateDisplay();
}

Phylowood.changeSlider = function() {
	
	if (typeof this.sliderBusy !== "undefined") {
		this.curClockTick = $( "#divSlider" ).slider("option","value");
		var pos = Phylowood.tickToPxScale(Phylowood.curClockTick);
		$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
	}
	this.sliderBusy = false;
}

Phylowood.updateDisplay = function() {

	// update slider position
	var pos = Phylowood.tickToPxScale(Phylowood.curClockTick);
	$( "#phyloSlider" ).attr("x1", pos).attr("x2", pos);
	$( "#divSlider" ).slider("option","value", Phylowood.curClockTick);
	
	Phylowood.updateMarkers();
}

Phylowood.updateMarkers = function() {

    if (this.areaType === "discrete")
    {
        for (var i = 0; i < this.numAreas; i++)
        {
            if (Phylowood.animationData[i].length !== 0)
            {
                this.arcs[i] = this.pie[i].selectAll("g.arc");
            }
        }
        

        if (Phylowood.prevZoom === Phylowood.map.zoom())
        {
            // cladogenesis (add / remove pie slices)
            if ($.inArray(Phylowood.curClockTick, Phylowood.divergenceTicks) !== -1 || Phylowood.forceRedraw === true)
            {
                console.log("cg", Phylowood.curClockTick);
                for (var i = 0; i < this.numAreas; i++)
                {
                    if (this.animationData[i].length !== 0)
                    {
                        // remove old pie 
                        //this.arcs[i] = this.pie[i].selectAll("g.arc")
                        //    .data(Phylowood.donut(Phylowood.animationData[i]))
                        //    .exit().remove();
//                        this.arcs[i] = this.pie[i].selectAll("path")
//                            .remove();
                        this.paths[i].remove();

                        // add new pie
                        this.arcs[i] = this.pie[i].selectAll(".arc")
                            .data(Phylowood.donut(Phylowood.animationData[i]))
                          .enter().append("svg:g")
                            .attr("class","arc" + i)
                            .attr("transform", function(d) {
                                return "translate(" + d.data.x + "," + d.data.y + ")";
                            });

                        // draw paths according to this.arc
                        this.paths[i] = this.arcs[i].append("svg:path")
                            .attr("fill", function(d) { return d.data.color; })
                            .attr("d", Phylowood.arc)
                            .attr("class", "marker");
                    }
                }
            }


            // anagenesis (animate pie depths)
            else
            {
                console.log("ag", Phylowood.curClockTick);
                for (var i = 0; i < this.numAreas; i++)
                {
                    if (this.animationData[i].length !== 0)
                    { 
                        //console.log(i, this.paths[i]);

                        this.paths[i]
                            .select(function(d) {
                                if (d.data.val[Phylowood.curClockTick] !== d.data.val[Phylowood.curClockTick - Phylowood.playForward])
                                    return this;
                                else
                                {
                                    //console.log(d);
                                    ///console.log( d.data.val[Phylowood.curClockTick], d.data.val[Phylowood.curClockTick - Phylowood.playForward]);
                                    return null;
                                }
                            })
                            .attr("d", Phylowood.arc);
           ;//             var x = d3.selectAll(".pie" + i + " path");
           ;//             x.attr("d", Phylowood.arc);
                    
                    /*
                        console.log(this.paths[i]);
                        this.paths[i]
                          .transition()
                            .duration(function(d) { 
                                // makes animations looth smoother when using slider
                                if (Phylowood.sliderBusy === true)
                                    return 5;
                                // otherwise, animate per clockTick of playSpeed
                                else
                                    return Phylowood.clockTick / Phylowood.playSpeed;
                            })
                            .attrTween("d", tweenDonut);
                       
                        var r = 5;
                        function tweenDonut(b) {
                            // console.log(b);
                            // oldIR = b.innerRadius || 0.0;
                            // oldOR = b.outerRadius || 0.0;

                            oldIR = Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * r *(1 - b.data.val[Phylowood.prevClockTick]) || 0.0;
                            oldOR = Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * r || 0.0;
                            newIR = Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * r *(1 - b.data.val[Phylowood.curClockTick]) || 0.0;
                            b.innerRadius = newIR;
                            //console.log(oldOR, oldIR, newIR);
                            var i = d3.interpolate({innerRadius:oldIR, outerRadius:oldOR},b);
                            return function(t) {
                                return Phylowood.arc2(i(t));
                            };
                        };
                        
                      ; // var x = d3.selectAll(".pie" + i + " path");
                    */
                    }
                }
           } 

/*
                // center arcs at foci
                this.arcs[i] = d3.selectAll("g.arc")
                    .data(Phylowood.donut(Phylowood.animationData[i]));

                console.log(this.arcs[i]);

                var x = d3.selectAll(".pie" + i + " path");
                x.attr("d", Phylowood.arc);
*/


                /*

                // draw paths according to this.arc
                // this.paths[i] = d3.selectAll(".pie" + i + " g")
                var x = d3.selectAll(".pie" + i + " path");
                //console.log(x);
                //x.transition(2000).duration(5000).attrTween("d", tweenDonut);
                x.transition()
                    .duration(function(d) { 
                        // makes animations looth smoother when using slider
                        if (Phylowood.sliderBusy === true)
                            return 5;
                        // otherwise, animate per clockTick of playSpeed
                        else
                            return Phylowood.clockTick / Phylowood.playSpeed;
                    })
                    .attrTween("d", tweenDonut);
               
                var r = 5;
                function tweenDonut(b) {
                    // console.log(b);
                    // oldIR = b.innerRadius || 0.0;
                    // oldOR = b.outerRadius || 0.0;

                    oldIR = Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * r *(1 - b.data.val[Phylowood.curClockTick]) || 0.0;
                    oldOR = Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * r || 0.0;
                    //newIR = 0.0; //r * (1.0 - b.data.val[Phylowood.curClockTick]);
                    newIR = Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * r *(1 - b.data.val[150]) || 0.0;
                    b.innerRadius = newIR;
                    //console.log(oldOR, oldIR, newIR);
                    var i = d3.interpolate({innerRadius:oldIR, outerRadius:oldOR},b);
                    return function(t) {
                        return Phylowood.arc2(i(t));
                    };
                };
                */

            Phylowood.zoomPauseAnimation = false;
        }
        else {
            Phylowood.prevZoom = Phylowood.map.zoom();
            Phylowood.zoomPauseAnimation = true;
        }

        // should the animation be paused?
        if (Phylowood.dragPauseAnimation === false
            && Phylowood.zoomPauseAnimation === false
            && Phylowood.forceRedraw === false)
        {
            Phylowood.prevClockTick = Phylowood.curClockTick;
            Phylowood.curClockTick += Phylowood.playTick;
        }
        else if (Phylowood.forceRedraw === true)
        {
            Phylowood.forceRedraw = false;
        }
        else if (Phylowood.dragPauseAnimation === true
            || Phylowood.zoomPauseAnimation === true)
        {
            d3.selectAll("path").transition(0);
        }

        // stop at boundaries
        if (Phylowood.curClockTick >= Phylowood.numClockTicks || Phylowood.curClockTick <= 0)
        {
            clearInterval(Phylowood.ticker);
        }
    }

    else if (this.modelType === "phylogeography" && this.areaType === "continuous")
    {
        if (Phylowood.prevZoom === Phylowood.map.zoom())
        {  

            // inactive lineages
            d3.selectAll("svg circle")
                .select(function(d)
                {
                    if (d.startClockTick > Phylowood.curClockTick || d.endClockTick <= Phylowood.curClockTick)
                        return this;
                    else
                        return null;
                })
                .attr("visibility", "hidden") 
                .attr("cx", function(d) { 
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.x[d.startClockTick];
                    else if (d.endClockTick <= Phylowood.curClockTick)
                        return d.x[d.endClockTick];
                })
                .attr("cy", function(d) {
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.y[d.startClockTick];
                    else if (d.endClockTick <= Phylowood.curClockTick)
                        return d.y[d.endClockTick];
                });

            // active lineages
            d3.selectAll("svg circle")
                .select(function(d)
                {
                    if (d.startClockTick <= Phylowood.curClockTick && d.endClockTick > Phylowood.curClockTick)
                        return this;
                    else
                        return null;
                })
              .transition()
                .ease("linear")
                .duration(function(d) { 
                    // makes animations looth smoother when using slider
                    if (Phylowood.sliderBusy === true)
                        return 5;
                    // otherwise, animate per clockTick of playSpeed
                    else
                        return Phylowood.clockTick / Phylowood.playSpeed;
                })
                .attr("visibility", function(d) {
                    if (d.maskContinuum === true)
                        return "hidden";
                    else
                        return "visible";
                })
                .attr("cx", function(d) { return d.x[Phylowood.curClockTick]; })
                .attr("cy", function(d) { return d.y[Phylowood.curClockTick]; });

            Phylowood.nodelines
              .transition()
                .ease("linear")
                .duration(function(d) { 
                    // makes animations looth smoother when using slider
                    if (Phylowood.sliderBusy === true)
                        return 5;
                    // otherwise, animate per clockTick of playSpeed
                    else
                        return Phylowood.clockTick / Phylowood.playSpeed;
                })
                .attr("x2", function(d) {
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.x[d.startClockTick];
                    else if (d.endClockTick < Phylowood.curClockTick)
                        return d.x[d.endClockTick];
                    else
                        return d.x[Phylowood.curClockTick];
                })
                .attr("y2", function(d) {
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.y[d.startClockTick];
                    else if (d.endClockTick < Phylowood.curClockTick)
                        return d.y[d.endClockTick];
                    else
                        return d.y[Phylowood.curClockTick];
                });

            Phylowood.zoomPauseAnimation = false;
        }
        else {
            Phylowood.prevZoom = Phylowood.map.zoom();
            Phylowood.zoomPauseAnimation = true;
        }

        // should the animation be paused?
        if (Phylowood.dragPauseAnimation === false
            && Phylowood.zoomPauseAnimation == false)
        {
            Phylowood.curClockTick += Phylowood.playTick;
        }
        else if (Phylowood.dragPauseAnimation === true
            || Phylowood.zoomPauseAnimation === true)
        {
            d3.selectAll("svg circle").transition(0);
        }

        // stop at boundaries
        if (Phylowood.curClockTick >= Phylowood.numClockTicks || Phylowood.curClockTick <= 0)
        {
            clearInterval(Phylowood.ticker);
        }
    }
}

/***
INFO BOX
***/

Phylowood.initFilter = function() {

    
    this.svgFilter = d3.selectAll("#divFilter").append("svg");
   
    // permanent labels
    this.svgFilter.append("svg:text")
        .text("Lineage name:")
        .attr("x", 10)
        .attr("y", 40)
        .style("fill","white")
    this.svgFilter.append("svg:text")
        .text("Lineage id:")
        .attr("x", 10)
        .attr("y", 20)
        .style("fill","white")
    this.svgFilter.append("svg:text")
        .text("Lineage start:")
        .attr("x", 10)
        .attr("y", 60)
        .style("fill","white")
    this.svgFilter.append("svg:text")
        .text("Lineage end:")
        .attr("x", 10)
        .attr("y", 80)
        .style("fill","white");

}

/***
UTILITY FUNCTIONS
***/

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

Phylowood.rnorm = function(mu, sigma) {
    var u = Math.random();
    var v = Math.random();
    var sqrt_u = Math.sqrt(-2 * Math.log(u));
    return {
        "x": sqrt_u * Math.cos(2 * Math.PI * v),
        "y": sqrt_u * Math.sin(2 * Math.PI * v)
    };
}

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

/***
GRAVEYARD OF SPOOKY CODE
***/
Phylowood.initMarkersForce = function() {
	this.markers = [];
//	var showStart = 20;
//	var showOnly = 20;
	var showStart = 0;
	var showOnly = this.numNodes;

	this.showThreshhold = 0.01;
		
    // for each divergence event
	for (var i = showStart; i < showOnly + showStart; i++) {
		var id = this.nodes[i].id;
		var c = this.nodes[i].color;
		var timeStart = this.nodes[i].timeStart;
		var timeEnd = this.nodes[i].timeEnd;
        var ancestor = this.nodes[i].ancestor;

        // for each area
		for (var j = 0; j < this.nodes[i].states.length; j++) {

            // for each lineage
			if (this.nodes[i].states[j] > this.showThreshhold) {
				this.markers.push({
					"id": id,
                    "ancestor": ancestor,
					"area": j,
					"val": this.nodes[i].states[j],
					"active": false,
					"timeStart": timeStart,
					"timeEnd": timeEnd,
					"color": "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)",
					"scheduleErase": false,
					"scheduleDraw": false,
					"maskContinuum": false
				});
			}
		}
	}
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
	
	var numPies = Phylowood.markers[0].length;
	//var numTimes = Phylowood.markers.length;
    var numTimes = 3;
	var t = 2;
	for (; t < numTimes; t++)
	{
	    for (i = 0; i < numPies; i++)
	    {
            bakepie("pie" + i, Phylowood.markers[t][i], foci[i].x, foci[i].y, 5);
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
	var numPacks = Phylowood.markers[0].length;
	for (i = 0; i < numPacks; i++)
	{
		var data = Phylowood.markers[t][i];
		var r = data.val.join("+"); // 
    	makePack("pack" + i, data, foci[i].x, foci[i].y, data.val.join("+") * 20);
    }	
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
	//	.charge( function(d) { return -Math.pow(Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 2) * d.val * 3, 2.0) / 8; } )
		.charge( function(d) {
            return -Math.pow(Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 2) * d.val * 4, 2.2);
        })
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
	var node = layer.selectAll("circle.marker")
			.data(states)
		.enter().append("svg:circle")
			.attr("class","marker")
			.attr("cx", function(d) { return foci[d.area].x; })
			.attr("cy", function(d) { return foci[d.area].y; })
			.attr("r",  function(d) {
                return Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * d.val * 3;
            })
			.attr("fill", function(d) { return d.color; })
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

		// update force properties with each move
        // Phylowood.force.charge( function(d) { return -Math.pow(Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 2) * d.val * 4, 2.2); } )

        // better visualization: have all nodes retain actual positions, instead of refocusing
		// it seems like areas contract at different zoom levels... weird
		// update positions of js states[] objects
		Phylowood.force.stop();
	
		// get new map-to-pixel coordinates for all states
        states.forEach(function(o,i) {
			xy = Phylowood.map.locationPoint({"lon": o.lon, "lat":o.lat});
			o.x = xy.x;
			o.y = xy.y; 
		});
		
		// update positions and radii for nodes
		node.attr("cx", function(d) { return d.x; })
		    .attr("cy", function(d) { return d.y; })
		    .attr("r", function(d) {
                return  Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * d.val * 3;
            });


		// update force foci positions
		for (var i = 0; i < coords.length; i++)
			foci[i] = Phylowood.map.locationPoint(coords[i]);
		
	    // force.resume();

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
		layer.selectAll(".marker")
		     .attr("cx", function(d) { return d.x; })
		     .attr("cy", function(d) { return d.y; });
		
	});
	
}
Phylowood.drawMarkersDiscretePie2 = function() {

	// div size (get dynamically)
	var h = document.getElementById("divGeo").offsetHeight;
	var w = document.getElementById("divGeo").offsetWidth;
    var r = 15;

	// geo data
	var data = this.animationData;
	var coords = this.geoCoords;
	var foci = [];
	
	// assign foci xy coordinates from geographical coordinates
	for (var i = 0; i < coords.length; i++)
		foci[i] = this.map.locationPoint(coords[i]);

    // add xy coordinates to markers
    data.forEach(function(d) {
        if (typeof d.coord !== "undefined")
        {
            xy = Phylowood.map.locationPoint(d.coord);
            d.x = xy.x;
            d.y = xy.y;
        }
    });

    // pie chart variables
    this.arc = d3.svg.arc()
        .startAngle(function(d) { return d.startAngle; })
        .endAngle(function(d) { return d.endAngle; })
        .innerRadius(0)// function(d) { console.log(d); return r * (1 - d.data.val[Phylowood.curClockTick]); })
        .outerRadius(r);

    // attach data
    this.pie = d3.selectAll("#divGeo svg") 
      .append("svg:g");

    // construct pie charts
    this.donut = [];
    this.arcs = [];
    this.paths = [];

    for (var i = 0; i < this.numAreas; i++)
    {
        // all non-zero values have equal arc lengths
        this.donut[i] = d3.layout.pie().value(function(d) {
            if (typeof d !== "undefined") {
                if (d.area === i) {
                    console.log("T",i,d);
                    return Math.ceil(d.val[Phylowood.curClockTick]);
                }
                //else
                //    console.log("F",d.area,d);
            }
        });

        // center arcs at foci
        this.arcs[i] = this.pie.selectAll("g.arc")
            .data(this.donut[i](data))
          .enter().append("svg:g")
            .attr("class","arc")
            .attr("transform", "translate(" + foci[i].x + "," + foci[i].y + ")");

        // draw paths according to this.arc
        this.paths[i] = this.arcs[i].append("svg:path")
            .attr("fill", function(d) { return d.data.color; })
            .attr("d", Phylowood.arc)
            .attr("class", "marker")
            
            /*
            .attr("visibility", function(d) {
                if (d.startClockTick <= Phylowood.curTick && d.endClockTick >= Phylowood.curTick)
                    return "visible";
                else
                    return "hidden";
            });*/
    }

    // how to rescale continuous markers if the map perspective changes
	this.map.on("move", function() {

		// get new map-to-pixel coordinates for all states
        data.forEach(function(d) {
            if (typeof d.coord !== "undefined")
            {
                xy = Phylowood.map.locationPoint(d.coord);
                d.x = xy.x;
                d.y = xy.y;
            }
        });
	
    /*
		// update positions and radii for nodes
		Phylowood.node
            .attr("cx", function(d) { 
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.x[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.x[d.endClockTick];
                else
                    return d.x[Phylowood.curClockTick];
            })
            .attr("cy", function(d) {
                if (d.startClockTick > Phylowood.curClockTick)
                    return d.y[d.startClockTick];
                else if (d.endClockTick < Phylowood.curClockTick)
                    return d.y[d.endClockTick];
                else
                    return d.y[Phylowood.curClockTick];
            })
		    .attr("r", function(d) {
                return  Math.pow( Phylowood.map.zoom() / Phylowood.bestZoom, 4) * d.val * 3;
            });
    */
	});	
}
/*
    // discrete areas: values change, coordinates constant
    else if (this.areaType === "discrete2")
    {
        // for each lineage, postorder
        for (var i = 0; i < this.numNodes; i++)
        {
            // get the node and its ancestor (or if it is the root, itself)
            var p = this.nodesPostorder[i];
            var q = p.ancestor || p;
            // console.log(p.id,q.id);
            
            // time lineage i exists
            var tClockStart = (p.timeStart / this.treeHeight) * this.endClockTime;
            var tClockEnd = (p.timeEnd / this.treeHeight) * this.endClockTime;
            var tClockDuration = tClockEnd - tClockStart;
            var startClockIdx = Math.ceil(tClockStart / this.clockTick);
            var endClockIdx = Math.ceil(tClockEnd / this.clockTick);
            var numClockIdx = endClockIdx - startClockIdx + 1;

            // lineage values
            var c = p.color;
            var color = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";

            // for each area
            for (var j = 0; j < this.numAreas; j++)
            {
                // get current value and tick size
                var v = p.states[j];
                vTick = (q.states[j] - v) / numClockIdx;
                var valArray = [];
                var showArray = [];

                // for each tick in [startClockIdx,endClockIdx] 
                for (var k = this.numClockTicks; k >= 0; --k)
                {
                    var val;
                    if (k >= startClockIdx && k <= endClockIdx)
                    {
                        val = v;
                        v += vTick;
                    }
                    valArray.push(val);
                }
                //console.log(valArray);
                this.animationData.push({
                    "id": p.id,
                    "area": j,
                    "val": valArray,
                    "coord": {"lat":this.geoCoords[j].lat, "lon":this.geoCoords[j].lon},
                    "color": color,
                    "startClockTick": startClockIdx,
                    "endClockTick": endClockIdx,
                    "maskContinuum": false
                });
            }
        }
    }
    */
/*
    else if (this.areaType === "discrete2")
    {
        // animationData = [area][time]

        // for each area
        for (var j = 0; j < this.numAreas; j++)
        {
            this.animationData[j] = [];

            // pre-compute basic lineage information
            var val = [];
            var tClockStart = [],
                tClockEnd = [],
                tClockDuration = [],
                startClockIdx = [],
                endClockIdx = [],
                numClockIdx = [],
                color = [],
                vTick = [];

            for (var i = 0; i < this.numNodes; i++)
            {
                // get the node and its ancestor (or if it is the root, itself)
                var p = this.nodesPostorder[i];
                var q = p.ancestor || p;
                //val[i] = 0;
                val[i] = p.states[j];

                // time lineage i exists
                tClockStart[i]  = (p.timeStart / this.treeHeight) * this.endClockTime;
                tClockEnd[i] = (p.timeEnd / this.treeHeight) * this.endClockTime;
                tClockDuration[i] = tClockEnd[i] - tClockStart[i];
                startClockIdx[i] = Math.ceil(tClockStart[i] / this.clockTick);
                endClockIdx[i] = Math.ceil(tClockEnd[i] / this.clockTick);
                numClockIdx[i] = endClockIdx[i] - startClockIdx[i] + 1;
                
                // vals and vTicks 
                vTick[i] = (q.states[j] - p.states[j]) / numClockIdx[i];
                //console.log(val[i], p.states[j]);

                // lineage colors
                var c = p.color;
                color[i] = "hsl(" + c[0] + "," + 100*c[1] + "%," + 100*c[2] + "%)";
            }

            // UNEXPECTED BEHAVIOR
            // console.log() DOES NOT report val correctly to Google Chrome
            // alert() has no problem.
            // alert(val);
            // console.log(val);

            var valArray = [];
            // for each tick in [startClockIdx,endClockIdx] 
            for (var k = this.numClockTicks; k >= 0; --k)
            {
                valArray[k] = [];
                // for each lineage
                for (var i = 0; i < this.numNodes; i++)
                {
                    // get current value and tick size
                    if (k >= startClockIdx[i] && k <= endClockIdx[i])
                    {
                        valArray[k][i] = val[i];
                        val[i] += vTick[i];
                    }
                    else
                        valArray[k][i] = 0;
                }
                // console.log(valArray[k]);

            }
            x = {
                "area": j,
                "val": valArray,
                "coord": {"lat":this.geoCoords[j].lat, "lon":this.geoCoords[j].lon},
                "color": color,
                "startClockTick": startClockIdx,
                "endClockTick": endClockIdx,
                "maskContinuum": false
            };
            //console.log(j,x);
            animationData[j].push(x);
        }
    }
    */
/*

// consider just using my own d3.layout.pie()
d3.layout.pie = function () {
    var value = Number, sort = d3_layout_pieSortByValue, startAngle = 0, endAngle = 2 * Math.PI;
    function pie(data, i) {
        var values = data.map(function(d, i) {
            return +value.call(pie, d, i);
        });
        var a = +(typeof startAngle === "function" ? startAngle.apply(this, arguments) : startAngle);
        var k = ((typeof endAngle === "function" ? endAngle.apply(this, arguments) : endAngle) - startAngle) / d3.sum(values);
        var index = d3.range(data.length);
        if (sort != null) index.sort(sort === d3_layout_pieSortByValue ? function(i, j) {
            return values[j] - values[i];
        } : function(i, j) {
            return sort(data[i], data[j]);
        });
        var arcs = [];
        index.forEach(function(i) {
            var d;
            arcs[i] = {
                data: data[i],
                value: d = values[i],
                startAngle: a,
                endAngle: a += d * k
            };
        });
        return arcs;
    }
    pie.value = function(x) {
        if (!arguments.length) return value;
        value = x;
        return pie;
    };
    pie.sort = function(x) {
        if (!arguments.length) return sort;
        sort = x;
        return pie;
    };
    pie.startAngle = function(x) {
        if (!arguments.length) return startAngle;
        startAngle = x;
        return pie;
    };
    pie.endAngle = function(x) {
        if (!arguments.length) return endAngle;
        endAngle = x;
        return pie;
    };
    console.log("hi");
    return pie;
}
*/
            /*
            // inactive lineages
            d3.selectAll("svg circle")
                .select(function(d)
                {
                    if (d.startClockTick > Phylowood.curClockTick || d.endClockTick <= Phylowood.curClockTick)
                        return this;
                    else
                        return null;
                })
                .attr("visibility", "hidden") 
                .attr("cx", function(d) { 
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.x[d.startClockTick];
                    else if (d.endClockTick <= Phylowood.curClockTick)
                        return d.x[d.endClockTick];
                })
                .attr("cy", function(d) {
                    if (d.startClockTick > Phylowood.curClockTick)
                        return d.y[d.startClockTick];
                    else if (d.endClockTick <= Phylowood.curClockTick)
                        return d.y[d.endClockTick];
                });

            // active lineages
            d3.selectAll("svg circle")
                .select(function(d)
                {
                    if (d.startClockTick <= Phylowood.curClockTick && d.endClockTick > Phylowood.curClockTick)
                        return this;
                    else
                        return null;
                })
              .transition()
                .ease("linear")
                .duration(function(d) { 
                    // makes animations looth smoother when using slider
                    if (Phylowood.sliderBusy === true)
                        return 5;
                    // otherwise, animate per clockTick of playSpeed
                    else
                        return Phylowood.clockTick / Phylowood.playSpeed;
                })
                .attr("visibility", function(d) {
                    if (d.maskContinuum === true)
                        return "hidden";
                    else
                        return "visible";
                })
                .attr("cx", function(d) { return d.x[Phylowood.curClockTick]; })
                .attr("cy", function(d) { return d.y[Phylowood.curClockTick]; });

            Phylowood.zoomPauseAnimation = false;
        }
        */
