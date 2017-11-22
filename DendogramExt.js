// JavaScript

/*globals define*/
define(["jquery",'qlik', "text!./style.css", "./jd","./D3utils"], 
	function($,qlik, cssContent) {
    $("<style>").html(cssContent).appendTo("head");
    return {
        initialProperties: {
            version: 1.1,
            qHyperCubeDef: {
                qDimensions: [],
                qMeasures: [],
                qInitialDataFetch: [{
                    qWidth: 15,
                    qHeight: 200
                }]
            }
        },
        definition: {
            type: "items",
            component: "accordion",
            items: {
                dimensions: {
                    uses: "dimensions",
                    min: 1,
                    max: 5
                },
                measures: {
                    uses: "measures",
                    min: 1,
                    max: 10
				},
                sorting: {
                    uses: "sorting"
                },
                settings: {
                    uses: "settings"
                }
            }
        },
        snapshot: {
            canTakeSnapshot: true
        },
		
		
        paint: function($element, layout) {
		
		if( window.clicked)
		{
			if(!window.clicked == 1)
			window.clicked = 0;
		}
		
            var qData = layout.qHyperCube.qDataPages[0];
            var qMatrix = qData.qMatrix;
            var numDims = layout.qHyperCube.qDimensionInfo.length;
            var numMsrs = layout.qHyperCube.qMeasureInfo.length;
			var measures = layout.qHyperCube.qMeasureInfo;
			var app = qlik.currApp();
			console.log(layout)
				var me = this;  
				/*this.backendApi.getProperties().then(function(reply){  
					reply.title = 'New title';  
					me.backendApi.setProperties(reply);  
				});*/  
            //use senseD3.createFamily to create JSON object
            var JSONObj = {name: "Global", children: senseD3.createFamily(qMatrix, numDims,measures)};
			//var upData = senseD3.mergeObjects(myJSON.children);
		
			function sort(d) {
				if (d.children) {
				  d.children = senseD3.sortByLEROI(d.children, 'le_roi');
				  d.children.forEach(function(child){
				  						sort(child);
									});
				}
				return d;
			}
			
			JSONObj = sort(JSONObj);

			// Since the Global object doesnt have info at its level,
			// we are calling calculateData method again so that we can calculate the 
			// various parameters at root leval as well.
             
			//var myJSON = senseD3.calculateData(JSONObj.children, JSONObj);
			var myJSON = JSONObj;

			//Save a copy of the JSON in the window object also to be used for global filter
			window.dataObj = myJSON;
			
			//myJSON = senseD3.setDimKeys(myJSON);
			//create unique id
            var id = "sb_" + layout.qInfo.qId;
			
			//creat this object for sending selections to backend api
			var self = this;

			//if extension has already been loaded, empty it, if not attach unique id
            if (document.getElementById(id)) {
                $("#" + id).empty();
            } else {
                $element.append($('<div />').attr("id", id).css("overflow","hidden"));
            }
            $("#" + id).width($element.width()).height($element.height());
			
			var selectionList = [];
			var selState = app.selectionState();
				selState.selections.forEach( function ( s ) {
				if(selectionList.indexOf(s.qSelected) == -1){
				  selectionList.push(s.qSelected);
				  if(s.fieldName == "Zone")
					selectionList.push("Zone");
				}
				});
			window.selList = selectionList;
			/* 
				DropDown to show the various Global Brands. 			
			*/
			var globalBrand = ['All Brands','All Global Brands','Corona','Stella Artois','Budweiser']; 
			var allGlobalbrands = ['Corona','Stella Artois','Budweiser'];
			window.dimKeyArr = [];
			function saveGlobalDimKeys(JsonObj)
			{
				//var dimKeyArr = [];
				if(JsonObj.children)
				{
					var children = JsonObj.children;
					children.forEach(saveGlobalDimKeys);
				}	
				else
				{
					for(var j = 0; j < allGlobalbrands.length; j++)
					{
						if(JsonObj.name == allGlobalbrands[j])
						{
							if(!window.dimKeyArr.includes(JsonObj.dim_key)){
								window.dimKeyArr.push(JsonObj.dim_key);
								//console.log(window.dimKeyArr);
								break;
							}
						}	
					}
					//return dimKeyArr;
				}
			}
			// Call to save the dimKeys for Global brands. 
			var dimKeysGlobal = saveGlobalDimKeys(JSONObj);
			
			
				/*
					This function is called when the user clicks on any of the global brands from the comboBox.
				*/
				function comboOnClick(me)
				{
					window.clicked = 1;
					var value = $(me).val();	
					var flag = false;
					var childObj;
					for(var i = 0; i < window.rootObj.length; i++)
					{
									if(value == "All Brands")
									{
									
										window.dataObj.parent = [];
										window.dataObj.depth = 999;
										refreshDataFromBackend(window.dataObj);
										break;
									}
									if(value == "All Global Brands")
									{
									
										window.dataObj.parent = [];
										refreshDataFromBackend(window.dataObj);
										break;
									}
						if(window.rootObj[i].leaf == false)
						{
						if(window.rootObj[i]._children)
							childObj = window.rootObj[i]._children;
							else
							childObj = window.rootObj[i].children;
							for(var j = 0; j < childObj.length; j++)
							{
								if(childObj[j].name == value){
									var filterObj = childObj[j];
									filterObj.parent = [];
									refreshDataFromBackend(filterObj);
									flag = true;
									break;
							}
						}
					}
						if(window.rootObj[i].name == value){
							var filterObj = window.rootObj[i];
							filterObj.parent = [];
							refreshDataFromBackend(filterObj);
							break;
						}
						if(flag == true)
						{
							break;
						}
						
					}
				}
				//$('select option[value= + '' + ]').attr("selected",true);
				
	
			var me = this;
				/////////////////////////
				// Collapsible Tree    //
				/////////////////////////
			//create temp total var for calculating sum for parent nodes from its leaf childs (setting to 0 before using the function)
			var total = 0;
			var total1 = 0;
			var collapseLevel = "vehicle";// Dendrogram initial collapse level. Possible values include "zone", "country", "brand"
            
			//create margins for the chart and define width n height of object
			var margin = {top: 40, right: 120, bottom: 20, left: 90},
                width = $("#" + id).width()-5,
                height = $("#" + id).height()-10;
                
            var i = 0,
                duration = 750,
                root;
			
			//create tree object with width, height and seperation space between nodes vertically & horizontally and assigning a value for that node (which can be read from d.value)
            var tree = d3.layout.tree()
                .size([height * 0.87, width])
				.separation(function(a, b) { return ((a.parent == root) && (b.parent == root)) ? 1 : 2; })
				.value(function (d) { return d['msr0']; });  // hardcoded here

            //create diagonality position of the curve
			var diagonal = d3.svg.diagonal()
                .projection(function(d) { return [d.y, d.x]; });
			 
			  // Added tooltip
			  var tooltip = d3.select("#" + id).append("div")
								.attr("class", "tooltipDendo")
								.style("opacity", 0);
            var svg = d3.select("#" + id).append("svg")
                .attr("width", width)
                .attr("height", height * 1 )
                .append("g")
            // .attr("transform", "translate("+ margin.left+ ","  + margin.top+ ")")
			    .attr("transform", "translate(70,80)");
				
		//create root object
			root = myJSON;
            root.x0 = height / 2;
            root.y0 = 0;

            
			var maxDepthEx = senseD3.findMaxValue("depth", tree.nodes(root).reverse());				
			window.selList = selectionList;
		
		
		// Function to collapse the nodes.
			function collapse(d) {
				if(d.children){
				if(selectionList.length > 0){
					var flag = false;
					if(d.children)
						children = d.children;
					else
						children = d._children;
						
					var ab = window.selList[0].split(",");
						if(ab.length > 1)
						{
							for(var l = 0; l < ab.length; l++)
							{
								ab[l] = ab[l].trim();
							}
						}
					
					if(ab.length == 1)
						ab = window.selList;
						
					for(var i = 0; i < children.length; i++)
					{
						
						for(var n = 0; n < ab.length; n++)
						{
							flag = false;
							if((ab.indexOf(children[i].name) != -1 && ab.indexOf(d.name) != -1 && children[i].leaf == true)){
								flag = true;
								break;
							}
							else if(ab.indexOf(children[i].name) != -1  && window.clicked == 1){
								flag = true;
								break;
							}
						}
						if(flag == true)
						break;
					}
					if(flag == false){
						d._children = d.children;
                		d._children.forEach(collapse);
                		d.children = null;
					}
            	}
				else{
					d._children = d.children;
                	d._children.forEach(collapse);
                	d.children = null;
				}
				}
				}
			
			collapseDendroGram(collapseLevel);
			
			/*
				This method collapses the Dendrogram till the collapseLevel specified by the 
				collapseLevel variable.
				Possible arguments can be "zone", "country", "brand"
			*/
			function collapseDendroGram(collapseLevel)
			{
			var dt;
			if(collapseLevel == "zone")
				root.children.forEach(collapse);
			else if(collapseLevel == "country")
			{
				dt = root.children;
				for(var i = 0; i < dt.length; i++)
				{
					dt[i].children.forEach(collapse);
				}
			}
			else if(collapseLevel == "brand")
			{
				// Do Nothing
			}
			window.selList = [];
			}
	
            //calling update() function for executing and rendering chart with root object data.
            update(root);
            /* Update Function is called on init and on node clicks */
            function update(source) {
		
			window.rootObj = [];
              var nodes = tree.nodes(root).reverse(),
              links = tree.links(nodes);	  
			  window.rootObj = nodes;
			  //create util variables to get max size, depth in the tree and defining some default node size
			  var maxDepth = senseD3.findMaxValue("depth", nodes);
              var maxSize = senseD3.findMaxValue("msr0", nodes);// hardcoded here
			  
              var fullCircleSize = 45 ;		// Size of each node (Basicaly the size of each circle)
			  var nodeLinkThickness = 40;	// Size of the links connecting nodes.
			    
              // Normalize for fixed-depth.
              nodes.forEach(function(d) { d.y = d.depth * width/(maxDepth+1); });
			  
              // Update the nodes…
              var node = svg.selectAll("g.node")
                  .data(nodes, function(d) { return d.id || (d.id = ++i); });
				  
			  // Enter any new nodes at the parent's previous position.
              var nodeEnter = node.enter().append("g")
                  .attr("class", "node")
                  .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
				  .on("click", click);

              //set radius of the node in enter
			  nodeEnter.append("circle")
			  	.attr("r", function(d) { 
				if(d.name == "Global")
				return (d['msr0']/maxSize) * fullCircleSize;// hardcoded here
				else
				return (d['msr0']/maxSize) * fullCircleSize; // hardcoded here
				});
				
			  //create label for leaf nodes
			  nodeEnter.append("text")
				.attr("x", function(d) { return d.children || d._children ? "-10px" : "10px"; })
				.attr("dy",  function(d) { return d.children || d._children ? "-10px" : "5px"; })
				.style("font-size", 
							function(d){
							if(selectionList.length > 0)
				   			{
								var ab = selectionList[0].split(",");
								if(ab.length > 1)
								{
									for(var l = 0; l < ab.length; l++)
									{
										ab[l] = ab[l].trim();
									}
							}
								if(ab.length == 1)
									ab = selectionList;
								for(var i = 0; i < ab.length; i++)
								{
									if(ab.indexOf(d.name) != -1 && ab.indexOf(d.parent.name) != -1){
										return "10px";
									}else if (ab.indexOf(d.name) != -1 && window.clicked ==1){
										return "10px";
									}
								}
							}
								else{
									return "10px";
								}
							}
					)
					
					//Label  for Leaf nodes
				.style("font-weight", "bold")
				.attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
				.text(function(d) { 
						return d.children || d._children ? "" : "(" + d.name + ")" + " $" + (d.msr0/1000000).toFixed(2) + "M " + "; " + d.msr2.toFixed(2) ;
					})
				.style("fill-opacity", 1)
				.style("fill", function(d) { 
					//calculating -/+ 10% variation for the LE and TGT
					var roiDiff = 0.1;
					var pctDiff = 0.5;
					/*var roiDiff = d.le_roi - d.target_roi;// hardcoded here .. uncomment below two lines
					var pctDiff = roiDiff / d.target_roi;
						*///if(pctDiff >= -0.10 && pctDiff <= 0.10)
						return "black";
							if(selectionList.length > 0)
				   			{
								var ab = selectionList[0].split(",");
								if(ab.length > 1)
								{
									for(var l = 0; l < ab.length; l++)
									{
										ab[l] = ab[l].trim();
									}
								}
							if(ab.length == 1)
								ab = selectionList;
				   				//if(d.target.children){
									/*for(var i = 0; i < d.target.children.length; i++)
									{
				   						if (selectionList.indexOf(d.target.children[i].name) != -1 && window.clicked ==1){
											if(pWA > -0.10 && pWA < 0.10)
												return "green";//green
										else
											return "firebrick";//red
										}
									}*/
				   				//}
								
								//Color change for Nodes
								for(var i = 0; i < ab.length; i ++)
								{
								
								
				   				if (ab.indexOf(d.name) != -1 && window.clicked ==1){
									if(d.msr2 >= 1)
										return "green";//green
									else 
										return "red";
									}
								else if (window.clicked ==1){
									return "lightgrey";
									}
								else
									{
									if(d.msr2 >= 1)
										return "green";//green
									else 
										return "firebrick";
									
									}
								}
							}
									else if(d.msr2 >= 1)
										return "green";
									else 
										return "red";
									
									
								}
						)
				.on("mouseover", function(d) {
				  d3.select(this).style("font-size", "15px");
					})                  
				.on("mouseout", function(d) {
				  d3.select(this).style("font-size", 
				  							function(d){
											
												var brandExits;
												if(selectionList.length == 1 && selectionList[0].indexOf(d.name) >= 0)
													brandExits = true;
											
												if(selectionList.indexOf(d.name) != -1 && selectionList.indexOf(d.parent.name) != -1){
													return "17px";
												}else if(selectionList.indexOf(d.name) != -1 && window.clicked == 1){
													return "19px";
												}else if(window.clicked == 1 && brandExits){
													return "19px";
												}else{
													return "12px";
												}
											});
					})
				.on("click", function(d) {
					window.clicked = 0;
				  	d3.select(this).style("font-size", "20px"); 
				  	refreshDataFromBackend(d);
					})
				;

	          //create label for  parent nodes 
			  nodeEnter.append("text")
			  	.attr("x", function(d) { return d.children || d._children ? "0px" : "10px"; })
				.attr("dy",  function(d) { return d.children || d._children ? ((-(d['msr0']/maxSize) * fullCircleSize).toFixed(0) - 10) + "px" : "3px"; })// hardcoded here
				.style("font-size", function(d){
								if(selectionList.indexOf(d.name) != -1 && selectionList.indexOf(d.parent.name) != -1){
									return "10px";
								}else if(selectionList.indexOf(d.name) != -1 && selectionList.indexOf("Zone")!= -1){
									selectionList[selectionList.indexOf("Zone")] = "";
									return "10px";
								}else if(selectionList.indexOf(d.name) != -1){
									return "10px";
								}else{
									return "10px";
								}
							})
				//Labels
				.style("font-weight", "bold")
				.attr("text-anchor", function(d) { return d.children || d._children ? "middle" : "start"; })
			  	.text(function(d) { 
						if(d.depth == 0){}
							//return "Global";
							//return "(" + d.name + ")" + " $" + (d.msr0/1000000).toFixed(2) + "M " + " ; " + d.msr2.toFixed(2) ;
						else
							return d.depth == maxDepthEx ? "" : "(" + d.name + ")" + " $" + (d.msr0/1000000).toFixed(2) + "M " + " ; " + (d.msr2/1000000).toFixed(2) ;
					})
			  	.style("fill-opacity", 1)
				.style("fill", function(d) { 
				
					//calculating -/+ 10% variation for the LE and TGT
					/*var roiDiff = d.le_roi - d.target_roi;// hardcoded here.. uncomment tow lines below
					var pctDiff = roiDiff / d.target_roi;*/
					var roiDiff = 0.5;
					var pctDiff = 0.1;
					
					//Color change for Nodes
								/*if(d.msr2 >= 1)
									return "green";
								else 
									return "red";
								*/
								return "black";
								}
						)
				.on("click", function(d) {
						window.clicked = 0;
				  d3.select(this).style("font-size", "20px");
				  if(d.name == 'Global')
				  	d.depth=999;
				  refreshDataFromBackend(d);
					})
					.on("mouseover", function(d) {
				  d3.select(this).style("font-size", "15px");
					}) 
					.on("mouseout", function(d) {
				  d3.select(this).style("font-size", 
				  							function(d){
												if(selectionList.indexOf(d.name) != -1 && selectionList.indexOf(d.parent.name) != -1){
													return "17px";
												}else if(selectionList.indexOf(d.name) != -1){
													return "17px";
												}else{
													return "12px";
												}
											});
					})
				;
			 
				  this.hierArr = [];
				  
				  //tool
				  nodeEnter.on('mouseover', function(d){
				  var targetROI;
						
						//var hierArr = [];
						var toolTipHier = getLabelHier(d);
						var tipString = "";
						
						tipString = toolTipHier[0];
						// hardcoded here ... uncomment the lines below
						/*if(typeof (d.target_roi) == "undefined" || typeof (d.delta_roi) == "undefined" || typeof (d.delta_spend) == "undefined")
						{
							targetROI = 0; deltaROI = 0; deltaSpend = 0; LEROI = 0;
						}
						else
						{
						 	targetROI = d.target_roi.toFixed(2);
						 	deltaROI = d.delta_roi.toFixed(2);
						 	deltaSpend = d.delta_spend.toFixed(2);
						 	LEROI = d.le_roi.toFixed(2);
							plannedSpend = (d.planned_spend/1000000).toFixed(2);
						//}... 
						.
						.
						till here*/
						var spanString = "<span style='color:white'>";
						var tipStringStyle = "<span style='color:lightblue'>";
						
						/*var roiDiff = d.le_roi - d.target_roi;// harddcoded here.. uncomment the lines below
						var pctDiff = roiDiff / d.target_roi;*/
						
						//var roiDiff = d.le_roi - d.target_roi;// hardcoded here...uncomment
						var pctDiff = 0.5;
						var roiStatus = '';
						  if(d.msr2 >= 1)
							  roiStatus = 'On Track';
						  else 
						  	  roiStatus='Off Track';
						
						var htmlString = tipStringStyle + tipString + "</span><br>Spend   : " +spanString+" $ "+ (d['msr0']/1000000).toFixed(2) + "M</span> <br> ROI: "+spanString+" "+ (d['msr2']).toFixed(2) + "</span>";
						//var htmlString = tipStringStyle + tipString + "</span><br>LE Spend   : " +spanString+" $ "+ (d.le_spend/1000000).toFixed(0) + "M</span><br/>ROI Status   : "+spanString+ roiStatus + "</span><br/>Planned Spend   : "+spanString+" $ " + plannedSpend + "M</span><br/>Target ROI  : "+spanString+ " $ " + targetROI + "</span></br>Delta ROI  :  " +spanString+ " $ "+ deltaROI + "</span></br>Delta Spend : " + spanString+  deltaSpend + "%</span>";
						//var htmlString = tipStringStyle + tipString + "</span><br>LE Spend   : " +spanString+" $ "+ (d.spend/1000000).toFixed(0) + "M</span><br/>LE ROI   : "+spanString+" $ " + LEROI + "</span><br/>Planned Spend   : "+spanString+" $ " + plannedSpend + "M</span><br/>Target ROI  : "+spanString+ " $ " + targetROI + "</span></br>Status  :  " +spanString+ " "+ roiStatus + "</span></br>Delta Spend : " + spanString+  deltaSpend + "%</span>";
						//var htmlString = tipStringStyle + tipString + "</span><br>LE Spend   : " +spanString+" $ "+ (d.spend/1000000).toFixed(0) + "M</span><br/>LE ROI   : "+spanString+" $ " + LEROI + "</span><br/>Planned Spend   : "+spanString+" $ " + plannedSpend + "M</span><br/>Target ROI  : "+spanString+ " $ " + targetROI + "</span></br>Delta ROI  :  " +spanString+ " $ "+ deltaROI + "</span></br>Delta Spend : " + spanString+  deltaSpend + "%</span>";
						
						var radius = ((d['msr0']/maxSize) * fullCircleSize).toFixed(0);// hardcoded here
						
						var yVal = Number(d.y) - 20;
						var xVal = Number(d.x) - radius - 37;
						if(d.name == "Global"){
							yVal = yVal + 40;
							//xVal = xVal - 5;
							}
						
				    	tooltip.transition()
									   .duration(200)
									   .style("opacity", .9);
				 		tooltip.html(htmlString).style("left", yVal + "px")
              						.style("top", (xVal + 18) + "px");
					
				  })
				  .on("mouseout", function(d) {
								  tooltip.transition()
									   .duration(500)
									   .style("opacity", 0)
								 })
									   

				/*
					This method returns the hierarchy of the nodes for a node to be shown on the tooltip.
				*/
				 function getLabelHier(d){
				 	this.arr;
					 if(d.parent)
				 	{
				 		this.hierArr.push(d.name);
				 		getLabelHier(d.parent)
				 	}
				 	else
				 	{
				 		if(!(this.hierArr[this.hierArr.length - 1] == d.name))
							this.hierArr.push(d.name);
				 	}
				 	if(this.hierArr.length != 0)
				 	this.arr = this.hierArr;
				 	this.hierArr = [];
					return this.arr;
				 }

              // Transition nodes to their new position.
              var nodeUpdate = node.transition()
                  .duration(duration)
                  .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

              //set colors nodes by parent or child
			  nodeUpdate.select("circle")
                 .style("fill", function(d) {
				 
				 	//calculating -/+ 10% variation for the LE and TGT
					//var roiDiff = d.le_roi - d.target_roi; // hardcoded here.. uncomment the below two lines.
					//var pctDiff = roiDiff / d.target_roi;
					
					var circleColorGen = d.msr2
					//var pctDiff = d.msr2;
					
					//console.log(d.name + '  ' + pctDiff);
					
					
						if(circleColorGen >= 1.00)
						 	return "green";
						else if(circleColorGen < 1.00)
							return "red";
						else
							return "ffcc00";
                  })
				  .style("stroke", "black")
				  .style("stroke-width",1.5)
				  .style("fill-opacity", function(d) {
					  if(d.children)
						return 1;
					  else if(d._children == null)
						return 1;
					  else if(d._children.length)
						return 1;
					  else
						return 1;
                  });

              //set leaf node lable opacity and color
			  nodeUpdate.select("text")
                  .style("fill-opacity", 1);

              // Transition exiting nodes to the parent's new position.
              var nodeExit = node.exit().transition()
                  .duration(duration)
                  .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
                  .remove();

              //set radius to node on exit
			  nodeExit.select("circle")
                  .attr("r", 0);
				  

              //set node label opacity on exit
			  nodeExit.select("text")
                  .style("fill-opacity", 1);

              //Update the paths/link in between nodes...
              var link = svg.selectAll("path.link")
                  .data(links, function(d) { return d.target.id; });

              //set more properties for paths/links that connect the nodes
			  link.enter().insert("path", "g")
				   .attr("class", "link")
				   .style("stroke", function(d){
				   if(selectionList.length > 0)
				   {
				   		if(d.target.children){
							for(var i = 0; i < d.target.children.length; i++)
							{
								if (selectionList.indexOf(d.target.children[i].name) != -1 && window.clicked ==1){
										return "Gainsboro";
								}
							}
				   		}
						
						if(selectionList.length > 0)
				   			{
								var ab = selectionList[0].split(",");
								if(ab.length > 1)
								{
									for(var l = 0; l < ab.length; l++)
									{
										ab[l] = ab[l].trim();
									}
								}
						if(ab.length == 1)
							ab = selectionList;
						for(var a = 0; a < ab.length; a++){
							if (ab.indexOf(d.target.name) != -1 && window.clicked ==1){
								return "Gainsboro";
							}
							else if(d.target.children && window.clicked == 1){
								var flagVal = checkChildrenForHighlighting(d.target, ab);
								if(flagVal == true)
								return "Gainsboro";
							}
							// If we want to not use the path dim functionality change this color to DimGrey
							else if (window.clicked ==1){
									return "Gainsboro";
									}
							}
							}
							else
							{
								return "DimGrey";//red
							}
						}
						else
							return "DimGrey";
				   })
					.style("stroke-width", function(d) {
						return d.target.msr0 / maxSize * nodeLinkThickness;})
					.style("opacity", function(d){
						return 1;
					})
				   	.attr("d",function(d) { 
						var o = {x: source.x, y: source.y}; 
				   		return diagonal ( { source: o , target : o });
				   	});

			function checkChildrenForHighlighting(childArr, globalBrands)
			{
				var flag = false;
				for(var i = 0; i < childArr.children.length; i++){
					for(j = 0; j < globalBrands.length; j++){
						if(globalBrands[j] == childArr.children[i].name)
						{
							flag = true;
							return flag;
						}
						else
						flag = false;
					}
				}
				return false;
			}
              // Transition links to their new position.
              link.transition()
                  .duration(duration)
                  .attr("d", diagonal);

              // Transition exiting nodes to the parent's new position.
              link.exit().transition()
                  .duration(duration)
                  .attr("d", function(d) {
                    var o = {x: source.x, y: source.y};
                    return diagonal({source: o, target: o});
                  })
                  .remove();

              // Stash the old positions for transition.
              nodes.forEach(function(d) {
                d.x0 = d.x;
                d.y0 = d.y;
              });
           	}//end of update function
			
            // Toggle children on click.
            function click(d) {
			  if (d.children) {
			  	d._children = d.children;
                d.children = null;
			  } else if(d._children){
			  	d.children = d._children;
                d._children = null;
              }

				 
				 update(d);
			}

			/*
					This method sends a request to the backend for filtering the data.
			*/
			function refreshDataFromBackend(d)
				{
					if(d.depth ==999){
				 	app.clearAll();
					//self.backendApi.selectValues(2,window.dimKeyArr,true);
				 }
				
				 //set node click to Qlik Sense to select dimension in app for only leaf node
				 else if(d.dim_key !== 'undefined' && d.depth > 0){// maxDepthEx-(maxDepth -1){
					
					var dimValKey = parseInt(d.dim_key, 0);
					var dimParentValKey = parseInt(d.parent.dim_key, 0);
					//var dimParentValKey = parseInt(d.parent.dim_key, 0);
					
					//Clear all selections before selecting clicked leaf node and its parent
					app.clearAll();
					
					//console.log((d.depth-1) + "  " + d.dim_key);
					if(!isNaN(dimParentValKey))
					self.backendApi.selectValues(d.depth-2,[dimParentValKey],true);
					self.backendApi.selectValues(d.depth-1,[dimValKey],true);
					
					//app.field('Brand').selectValues([globalAllBrands], true, true);
				 }
				 
				 //else if(d.name == "Global" && d.parent.length < 1){
				 else if(d.depth ==0){
				 	app.clearAll();
					self.backendApi.selectValues(2,window.dimKeyArr,true);
				 }
			
}
        }, //paint function end
		
		resize:function($el,layout){
          //do nothing when user resizes the chart
		  // this.paint($el,layout);
        }
		
    };
}
);
