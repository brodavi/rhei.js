/**
 * rhei-gui.js
 * David Brooks
 * MIT License
 */

var FBPgui = {};

FBPgui.run = function (events) {
  for (var x = 0; x < events.length; x++) {
    var event = events[x];

    var eventTypeMap = {
      'instantiate_process': FBPgui.instantiate_process,
      'register_network': FBPgui.instantiate_network,
      'firing_process': FBPgui.process_active
    }

    var visualizer = eventTypeMap[event.type];
    visualizer ? visualizer(event.data) : null;
  }
};

FBPgui.process_active = function (data) {
  var div = document.querySelector('div[data-processid="' + data.process.id + '"]');
  div.classList.add('fbp_process_active');
  window.setTimeout(function () {
    div.classList.remove('fbp_process_active');
  }, 10);
};

FBPgui.instantiate_process = function (data) {
  var col = Math.floor(Math.random() * 5);
  var row = Math.floor(Math.random() * 5);
  var div = document.createElement('div');
  div.classList.add('fbp_process');
  div.classList.add('fbp_col_'+col);
  div.classList.add('fbp_row_'+row);

  var label = document.createElement('div');
  label.innerHTML = data.process.name;
  div.appendChild(label);

  div.dataset.processid = data.process.id;

  var bkgd = document.querySelectorAll('.fbp_network[data-networkid="' + data.process.network.id + '"]');
  bkgd[0].appendChild(div);
};

FBPgui.instantiate_network = function (data) {
  var div = document.createElement('div');
  div.classList.add('fbp_network');

  var label = document.createElement('div');
  label.innerHTML = data.network.name;
  div.appendChild(label);

  div.dataset.networkid = data.network.id;

  document.body.appendChild(div);
};

FBP._plugins.push(FBPgui);
