var senseD3 = {
    arcTween: function(d, x, y, radius, arc) {
        var xd = d3.interpolate(x.domain(), [d.x, d.x + d.dx]),
            yd = d3.interpolate(y.domain(), [d.y, 1]),
            yr = d3.interpolate(y.range(), [d.y ? 20 : 0, radius]);
        return function(d, i) {
            return i ? function(t) {
                return arc(d);
            } : function(t) {
                x.domain(xd(t));
                y.domain(yd(t)).range(yr(t));
                return arc(d);
            };
        };
    },
    computeTextRotation: function(d, x) {
        return (x(d.x + d.dx / 2) - Math.PI / 2) / Math.PI * 180;
    },
  //create family is to be used for creating a tree type data structure which can be used in most D3 tree vizualizations.  
  //See more info about the tree layout here:  https://github.com/mbostock/d3/wiki/Tree-Layout
    createFamily: function(dataSet,numDims,measures) {
        var numDims;
		window.mainData = dataSet;
		//sudhakar
		
		var parobj = []
		var i=0;
		var j=0;
		var k=0;
		var par11;
		var par12;
		var par21;
		var par22;
		var par1;
		var par2;
		var childs = {};
		var pars1 = []
		var child;
		$.each(dataSet,function(index,data){
			child = {};
			child['dim_key'] = data[2].qElemNumber;
			child['hide_node'] = false;
			child['leaf'] = true;
			child['msr0'] = data[3].qText
			child['msr1'] = data[4].qText
			child['name'] = data[2].qText
			
			if(data[1].qText == par2 && data[0].qText == par1){
				par11 += parseFloat(data[3].qText)
				par12 += parseFloat(data[4].qText)
				par21 += parseFloat(data[3].qText)
				par22 += parseFloat(data[4].qText)
				childs[k] = child
				k++;	
			}else if(data[0].qText == par1){				
				pars1.push(childs)
				childs = {};
				par2 = data[1].qText;
				par11 += parseFloat(data[3].qText)
				par12 += parseFloat(data[4].qText)
				
				pars1[j]['dim_key'] = data[1].qElemNumber;
				pars1[j]['name'] = data[1].qText;
				pars1[j]['leaf'] = false;
				if(j>0){
					//parobj[i][j-1]={};
					//pars1['dim_key'] = data[1].qElemNumber;
					pars1[j-1]['msr0'] = par21;
					pars1[j-1]['msr1'] = par22;
					//pars1['name'] = data[1].qText;	
				}	
				par21 = parseFloat(data[3].qText);
				par22 = parseFloat(data[4].qText);
				k=0;	
				childs[k] = child
				//parobj[i][j][k] = child;			
				j++;
			}else{
				if(j>0){
					pars1.push(childs)
					//pars1[j] = childs
					childs = {};
					pars1['msr0'] = par21;
					pars1['msr1'] = par22;
					
				}
				if(i>0){
					//parobj.push(pars1)
					parobj[i-1] = pars1 
					pars1 = {};
					parobj[i-1]['msr0'] = par11;
					parobj[i-1]['msr1'] = par12;	
				}	
				par1 = data[0].qText;
				par2 = data[1].qText;
				parobj[i] = {}
				parobj[i]['dim_key'] = data[0].qElemNumber;
				parobj[i]['name'] = data[0].qText;
				parobj[i]['leaf'] = false;
				//pars1[j] = {}
				//pars1[j]['dim_key'] = data[1].qElemNumber;
				//pars1[j]['name'] = data[1].qText;
				//pars1[j]['leaf'] = false;
				par11 = parseFloat(data[3].qText);
				par12 = parseFloat(data[4].qText);
				par21 = parseFloat(data[3].qText);
				par22 = parseFloat(data[4].qText);
				k=0;
				j++;
				i++;
			}
		})
		
		
		//sudhakar
		this.mergedData = [];
		var numMsrs = measures.length;
        if(arguments.length==1) {
            numDims = 2;
        }
        
        //create arrays of parents and children.  this is so we can determine if there's any nodes without parents.  these would be the top parents 
        var parentsA = [];
        var kidsA = [];
        //format Sense data into a more easily consumable format and build the parent/child arrays

        var happyData = [];
        for(s in dataSet){
            var d = dataSet[s];
            for(i=0; i<numDims-1; i++){
				
                if (parentsA.indexOf(d[i].qText) === -1) {
                    parentsA.push(d[i].qText);
                }
                var parentVal = "";
                if ((!(d[i].qText)) || (d[i].qText == "-") || (d[i].qText == "") || (d[i].qText) == " ") {
                    parentVal = "[root]";
                } else {
                    parentVal = d[i].qText;
                }
                if (kidsA.indexOf(d[i+1].qText) === -1) {
                    kidsA.push(d[i+1].qText);
                }
                var exists = false;
                $.each(happyData, function(){
					if((this.parent == parentVal) && (this.name == d[i+1].qText)){
						exists = true;
                    }
                });
                if(!exists){
				// Build the dataset dynamically for n measures
				var newDataSet = {};
					for(n = 0; n < numMsrs; n++){
					var msrName = measures[n].qFallbackTitle.toLowerCase().replace(/ /g,'_');
							newDataSet["msr" + n]=  d[numDims + n].qNum;
							//msrs.push(msrsObj);
					}
					newDataSet['name'] = d[i+1].qText;
					newDataSet['dim_key'] = d[i+1].qElemNumber;
					newDataSet['hideNode'] = false;
					newDataSet['parent'] = parentVal;
					newDataSet['uniqId'] = d[i+1].qText + d[i+1].qElemNumber;
					newDataSet['leaf'] =(i+1) === (numDims-1) ? true : false;
                    happyData.push(newDataSet);
                }				
            }
        }

        //loop through the parent and child arrays and find the parents which aren't children.  set those to have a parent of "-", indicating that they're the top parent
        $.each(parentsA, function(index, data) {
           if (kidsA.indexOf(this.toString()) === -1) {
			var dimK;
			var msr0;
			var msr1;
			// Included this looping 
            	for(var i = 0; i < window.mainData.length; i++)
            	{
            		var ob = window.mainData[i];
            		for(var j = 0; j < ob.length; j++)
            		{
						  if(data == ob[j].qText){
							  dimk = ob[j].qElemNumber;
							  msr0 = ob[6].qText;
							  msr1 = ob[7].qText;
							  break;
						  }
					}				
				}
                var noParent = {
                    "name": this.toString(),
					"dim_key" : dimk,
                    "parent": "[root]",
					"msr0" : msr0,
					"msr1" : msr1,
					"msr2" : msr1
                }
                happyData.push(noParent);
			}
           
        });

        //crawl through the data to create the family tree in JSON
        function getChildren(name) {
            return happyData.filter(function(d, index, array) {
                    return d.parent === name;
                })
                .map(function(d, idx, arr) {
                    var mapping = {};
                    if(d.leaf) {
					mapping = getMappingData(d,true);
                    }
                    else {
                        mapping = getMappingData(d, false);
						mapping['children'] =  getChildren(d.name);
                    }
                    
                    return mapping;
                });
        }
		
		function getMappingData(d, leaf){
			var mapping = {};
			var i = 0;
			for(i = 0; i < numMsrs; i++){
			var msrName = measures[i].qFallbackTitle.toLowerCase().replace(/ /g,'_');
					mapping["msr" + i]=  d["msr" + i];
				}	
			if(leaf)
				mapping['msr' + i] = d["msr1"]/d["msr0"];
			mapping['name'] = d.name;
			mapping['dim_key'] = d.dim_key;
			mapping['hideNode'] = d.hideNode;
			mapping['leaf'] = leaf;
			return mapping;			
		}

        var JSONtree = getChildren('[root]');
		//JSONtree = setCalculations(JSONtree);
		
		/*
			This method is a recursive method that helps to identify if a node is a 
			leaf or not. If its a leaf, it sends the data(parent of leaf) to the CalculateData() method
			for calculaions. If the node is node is not a leaf, it recursively calls
			this method till it identifies its leaf.
			For a parent with children, it combines its children into one array and sends it
			to the calculateData function for calculating the parameters.
		*/
		function setCalculations(JSONtree,originalData){
			var data = JSONtree;
			for(var i = 0; i < data.length; i++)
			{
				if(data[i].leaf==false)
					setCalculations(data[i].children,data[i])
				else
				{
					originalData.leafFlag = true;
					data = senseD3.calculateData(data,originalData);
					break;				
				}
					
			}			
			// To check if the parent leaf has been set to true
			// If yes get the data
			if(Array.isArray(data))
			{	
				//console.log(data);
				if(data[0].hasOwnProperty('leafFlag'))
				{
					if(data[0].leafFlag == true)
					{
						var mergedData = [];
						data = senseD3.mergeObjects(data, mergedData);
						data = senseD3.calculateData(data, originalData);
					}
				}
			}
			return data;
		}
        return JSONtree;
    },
	
	
	
		/* 
		   Function to merge leaf nodes into one object. This is
		   necessary because all the weighted calculations happen at 
		   the leaf levels. 
		*/
		 mergeObjects: function(data, mergedData){
			//var mergedData = [];
			for(var k = 0; k < data.length; k++)
			{	
				if(data[k].leaf == true)
				{
					mergedData.push(data[k]);
				}
				else
					senseD3.mergeObjects(data[k].children,mergedData)
		}
		return mergedData;
		},
		
		/*
			Function to calculate the data for each node of the Dendrogram
			This accepts two arguments, a data object which is used to calculate 
			data and the data Array where the changes are made and returned.
		*/
		 calculateData : function(data, originalData){
			var totalSpend = 0;
			var totalMaco = 0;
			var totalROI = 0;
			for(var i = 0; i < data.length; i++)
			{
				totalSpend = totalSpend + data[i]['msr0'];
				totalMaco = totalMaco +  data[i]['msr1'];
			}
			totalROI = totalMaco / totalSpend;
			originalData['msr0'] = totalSpend;
			originalData['msr1'] = totalMaco;
			originalData['msr2'] = totalROI;

			return originalData;
		},	
		
    // Traverse the dataset to find the maximum value of a 
    // specified attribute from all of the nodes in the passed dataset
    findMaxValue: function(attr, dataSet) {
        var maxValue = 0;
        dataSet.forEach(function(d) {
            maxValue = (d[attr] > maxValue ? d[attr] : maxValue);
        });
        return maxValue;
    },
	
	sortByLEROI: function (array, key) {
		//console.log(array);
		//console.log(key);
	  return array.sort(function(a, b) {
		  var x = b[key]; var y = a[key];
		  return ((x < y) ? -1 : ((x > y) ? 1 : 0));
	  });
	 },
	
	setDimKeys: function(myJSON){
		for(var i = 0; i < myJSON.children.length; i++){
			myJSON.children[i].dim_key = i;
		}
		return myJSON;
	}
};
