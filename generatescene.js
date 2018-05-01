var width = 960,
      height = 500;

var x = d3.scale.ordinal()
      .rangePoints([0, width], 1),
      y = {},
      dragging = {};

var line = d3.svg.line();
var background, foreground;

var csvData;
var names;

var offsetx = 500;
var zOffset = 0;

var selectedElement;
var ghostElement;
var holding = false;

AFRAME.registerComponent('controller-listener', {
      init: function () {

            this.el.addEventListener('click', function (evt) {

            if (holding) {
                  // Replace old element with new element
                  var newCoords = evt.detail.intersection.point;

                  selectedElement.setAttribute('positionX', newCoords.x);
                  selectedElement.setAttribute('positionZ', newCoords.y);
                  selectedElement.setAttribute('colour', 'purple');

                  holding = false;
                  selectedElement = undefined;
            }else{
                  // Store this element
                  selectedElement = evt.detail.intersectedEl;
                  selectedElement.setAttribute('colour', 'orange');
                  var axis = selectedElement.getAttribute('axis');

                  if (!(typeof axis === "undefined")) {
                    // Axis

                    holding = true;
                    // Give visual feedback
                    selectedElement.setAttribute('colour', '#AAA');

                    // Create a duplicate ghost element on the raycaster
                  } else if (!(selectedElement.getAttribute('datum'))) {
                    // Datum

                    var text = d3.select("a-text[id='Display']");


                  }
            }
      });
      }
});

AFRAME.registerComponent('movement-listener', {
schema: {
cameraRig: {type: 'selector'},
speed: {type: 'int', default: 2}
},

init: function () {
this.pressed = {};
this.position = {};
var el = this.el;

el.addEventListener('triggerup', this.onTriggerUp);
el.addEventListener('triggerdown', this.onTriggerDown);
el.addEventListener('gripup', this.onGripUp);
el.addEventListener('gripdown', this.onGripDown);
},

tick: function (time, delta) {
var currentPosition;
var data = this.data;
var el = this.el;
var position = this.position;
var speed = this.speed;

const rig = data.cameraRig || el.sceneEl.camera.el;
if (this.pressed.trigger) {
currentPosition = rig.getAttribute('position');
position.x = currentPosition.x + data.speed;
rig.setAttribute('position', position);
} else if (this.pressed.grippad) {
currentPosition = rig.getAttribute('position');
position.x = currentPosition.x - data.speed;
rig.setAttribute('position', position);
}
},

onTriggerDown: function (event) {
this.keys['trigger'] = true;
},

onTriggerUp: function (event) {
delete this.keys['trigger'];
},

onGripDown: function (event) {
this.keys['grippad'] = true;
},

onGripUp: function (event) {
delete this.keys['grippad'];
}
});

d3.csv("cars.csv", function(cars) {
// Store data
csvData = cars;
csvData.map(function(d) {
return +d;
});
// Generate axes
// Delete old axis (if they exist)
d3.select("a-scene").selectAll("a-datum").remove();
// Generate column position scale
names = d3.keys(cars[0]).filter(function(column_name) {
return column_name != "name";
})
var xScale = d3.scale.linear();
xScale.range([0, width]);
xScale.domain([0, (names.length - 1)]);

d3.select("a-scene").selectAll("a-axis")
.data(names)
.enter()
.append("a-axis")
.each(function(datum, index) {
// Select itself
var entity = d3.select(this);
var boundaries = d3.extent(cars, function(max_values) {
return +max_values[datum];
});

console.log("Creating axis at x=" + xScale(index) + " using " + index + " for " + datum);
console.log("Boundardies: " + boundaries);

// Set attributes
entity.attr("name", datum);
entity.attr("positionorder", index);
entity.attr("positionx", xScale(index));
entity.attr("positionz", zOffset);
entity.attr("height", height);
entity.attr("minvalue", boundaries[0]);
entity.attr("maxvalue", boundaries[1]);
});
/*
  var plane = d3.select("a-scene")
    .append("a-plane")
    .attr("position", offsetx + " " + 0 + " " + x(dimensions[0]))
    .attr("height", height)
    .attr("width", width);
*/
});

function generateLines(sector, lineColour) {
if (sector < 0) {
// No section here
return 0;
}

// eg section 1: axes 1 to 2
// Retrieve axes of section
var leftAxis = d3.select("a-scene").select("a-axis[positionorder='" + sector + "']");
var rightAxis = d3.select("a-scene").select("a-axis[positionorder='" + (sector + 1) + "']");

// Check if at right edge
if (rightAxis.empty()) {
// No section here
return 0;
}

// Generate y-scale for left axis
var leftYScale = d3.scale.linear();
leftYScale.domain([leftAxis.attr("minvalue"), leftAxis.attr("maxvalue")]);
leftYScale.range([leftAxis.attr("height"), 0]);

// Generate y-scale for right axis
var rightYScale = d3.scale.linear();
rightYScale.domain([rightAxis.attr("minvalue"), rightAxis.attr("maxvalue")]);
rightYScale.range([rightAxis.attr("height"), 0]);

// Remove old lines
d3.select("a-scene").selectAll("a-datum[sector='" + sector + "']").remove();

console.log("Generating lines for sector: " + sector);

var entity = d3.select("a-scene").append("a-datum");
entity.attr("sector", sector);
var index = 1;
var value;

for (let datum of csvData) {
value = "start: " + leftAxis.attr("positionx") + ", " + leftYScale(datum[leftAxis.attr("name")]) + ", " + leftAxis.attr("positionz");
value += "; end: " + rightAxis.attr("positionx") + ", " + rightYScale(datum[rightAxis.attr("name")]) + ", " + rightAxis.attr("positionz");
value += "; color: " + lineColour;
entity.attr("line__" + index, value);
index++;
}
}

/**
Represents one axis
*/
AFRAME.registerComponent('axis', {
schema: {
colour: {
default: '#FFF'
},
linecolour: {
default: 'black'
},
name: {
type: 'string',
default: ''
},
positionOrder: {
type: 'int',
default: 1
},
positionX: {
type: 'number',
default: 1
},
positionZ: {
type: 'number',
default: 1
},
height: {
type: 'number',
default: height
},
maxValue: {
type: 'number',
default: height
},
minValue: {
type: 'number',
default: 0
}
},

init: function() {
var data = this.data;
var geometry;
var material;

material = this.material = new THREE.MeshBasicMaterial({
color: data.colour,
opacity: 1,
transparent: 0,
visible: true
});

geometry = this.geometry = new THREE.BoxBufferGeometry(4, data.height, 4, 1, 1, 1);

this.mesh = new THREE.Mesh(geometry, material);
this.mesh.position.set(data.positionX, data.height/2, data.positionZ);

this.el.setObject3D('mesh', this.mesh);
},

update: function(oldData) {
// On property update (and after init)
var data = this.data; // Property values
var geometry = this.geometry;
var geoNeedsUpdate = false;
var material = this.material;
var mesh = this.mesh;

// Height change
/*if (data.height !== oldData.height){
this.el.removeObject3D('mesh');
if (!(typeof something === "undefined")){
geometry.dispose();
}

geometry = new THREE.BoxBufferGeometry(4, data.height, 4, 1, 1, 1);
mesh = new THREE.Mesh(geometry, material);
mesh.position.set(data.positionX, data.height/2, data.positionZ);

this.el.setObject3D('mesh', this.mesh);
}*/

// Geometry change
if (data.positionX !== oldData.positionX ||
data.positionZ !== oldData.positionZ) {
// Check for overlap
var prevAxis = d3.select("a-scene").select("a-axis[positionorder='" + (data.positionOrder - 1) + "']");
var nextAxis = d3.select("a-scene").select("a-axis[positionorder='" + (data.positionOrder + 1) + "']");

// Check for order changes
if (!prevAxis.empty() && (data.positionX < prevAxis.attr("positionx"))) {
// Axis has been moved down the list
// Swap prevAxis' positionOrder
prevAxis.attr("positionorder", data.positionOrder);
// Decrement positionOrder
var thisAxis =  d3.select("a-scene").select("a-axis[name='" + data.name + "']");
thisAxis.attr("positionorder", data.positionOrder - 1);
data.positionOrder--;
} else if (!nextAxis.empty() && (data.positionX > nextAxis.attr("positionx"))) {
// Axis has been moved up the list
// Swap nextAxis' positionOrder
nextAxis.attr("positionorder", data.positionOrder);
// Increment positionOrder
var thisAxis =  d3.select("a-scene").select("a-axis[name='" + data.name + "']");
thisAxis.attr("positionorder", data.positionOrder + 1);
data.positionOrder++;
}

// Update lines
if (data.positionOrder == 0) {
// Start
generateLines(0, data.linecolour);
generateLines(1, data.linecolour);
} else if (data.positionOrder == names.length - 1) {
// End
generateLines(data.positionOrder - 1, data.linecolour);
generateLines(data.positionOrder - 2, data.linecolour);
} else {
// Middle
for (i = (data.positionOrder - 2); i < data.positionOrder + 3; i++) {
  generateLines(i, data.linecolour);
}
}
}

mesh.position.set(data.positionX, data.height/2, data.positionZ);
material.color.set(data.colour);

//geometry.attributes.position.needsUpdate = true;
//geometry.computeBoundingSphere();
},

remove: function() {
this.el.removeObject3D('mesh');
}
})

/**
Represents one axis
*/
AFRAME.registerComponent('datum', {
schema: {
colour: {
default: 'red'
},
sector: {
type: 'int',
default: 0
}
}
})

AFRAME.registerPrimitive('a-axis', {
// Attaches 'axis' to 'a-axis'
defaultComponents: {
axis: {}
},

mappings: {
colour: 'axis.colour',
name: 'axis.name',
positionorder: 'axis.positionOrder',
positionx: 'axis.positionX',
positionz: 'axis.positionZ',
height: 'axis.height',
maxvalue: 'axis.maxValue',
minvalue: 'axis.minValue',
linecolour: 'axis.linecolour'
}
})

AFRAME.registerPrimitive('a-datum', {
// Attaches 'axis' to 'a-axis'
defaultComponents: {
datum: {}
},

mappings: {
colour: 'datum.colour',
sector: 'datum.sector'
}
})
