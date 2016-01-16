/**
 * rhei.js
 * David Brooks
 * MIT License
 */

FBP = {};
FBP._components = [];
FBP._networks = [];
FBP._ips = {};
FBP._suspendCounts = {};
FBP._maxSuspends = 0;
FBP._suspendsLimit = 1000; // make this a config
FBP._events = []; // for other modules (like gui)
FBP._plugins = []; // plugins will register here

/**
 * Run any plugins the system might have registered
 */
FBP.runPlugins = function () {
  for (var x = 0; x < FBP._plugins.length; x++) {
    FBP._plugins[x].run(FBP._events);
  }
};

/**
 * Clear events from the event array
 */
FBP.clearEvents = function () {
  FBP._events = [];
};

/**
 * Register a component with the runtime
 * @param {obj} c - A component object
 *
 * {
 *  name: 'component name',
 *  inPorts: ['in1', ... 'inN'],
 *  outPorts: ['out', ... 'outN'],
 *  body: component's function
 * }
 */
FBP.component = function (component) {
  FBP._components.push(component);
};

/**
 * Takes a component and turns it into a running process
 * @param {string} pname - A process name
 * @param {string} cname - A component name
 */
FBP._instantiateProcess = function (pname, cname, network) {
  var newInPorts, newOutPorts, component, process;

  component = FBP._components.find(c => c.name == cname);

  if (!component) throw new Error('whoops no component: ' + cname);

  // building inPorts
  if (component.inPorts) {
    newInPorts = component.inPorts.map(p => ({
      name: p,
      thisProcessName: pname,
      data: []
    }));
  }

  // building outPorts
  if (component.outPorts) {
    newOutPorts = component.outPorts.map(p => ({
      name: p,
      connectedTo: null,
      data: []
    }));
  }

  process = {
    id: Math.random().toString(16).slice(2),
    network: network,
    name: pname,
    componentName: component.name,
    ipCount: 0,
    inPorts: newInPorts,
    outPorts: newOutPorts,
    body: component.body
  };

  FBP._events.push({
    type: 'instantiate_process',
    data: {
      process: process
    }
  });

  return process;
};

/**
 * Create an Information Packet
 * @param {anything} data - A data packet's data
 *
 * Can be strings, numbers, objects anything really.
 */
FBP.createIP = function (data) {
  var ip = {
    id: Math.random().toString(16).slice(2),
    data: data,
    holdingProcess: null
  };
  FBP._ips[ip.id] = ip;

  FBP._events.push({
    type: 'create_ip',
    data: ip
  });

  return ip;
};

/**
 * Drop an Information Packet
 * @param {IP} ip - An Information Packet
 */
FBP.dropIP = function (dropme) {
  if (Array.isArray(dropme)) {
    FBP._log('dropping array of IPs: ');
    for (var x = 0; x < dropme.length; x++) {
      FBP._log('dropping IP: ' + typeof(dropme[x]) + ' ' + dropme[x].id);

      dropme[x].holdingProcess.ipCount--;
      delete(FBP._ips[dropme[x].id]);
      dropme[x] = null;

      FBP._events.push({
        type: 'drop_ip',
        data: dropme[x]
      });

    }
    FBP._log('... end dropping array of IPs');
  } else {
    FBP._log('dropping IP: ' + typeof(dropme) + ' ' + dropme.id);

    dropme.holdingProcess.ipCount--;
    delete(FBP._ips[dropme.id]);
    dropme = null;

    FBP._events.push({
      type: 'drop_ip',
      data: dropme
    });

  }

  return null;
};

/**
 * Register a network with the runtime
 * @param {obj} network - A network config object
 * {
 *  name: 'network name',
 *  processes: [
 *    {name: 'process name', component: 'component name'}
 *  ],
 *  connections: {
 *    'process.output connection name': 'process.input connection name',
 *    ...
 *    '[last connection out]': '[last connection in]'
 *  }
 * }
 */
FBP.network = function (network) {
  FBP._log('Registering network: "' + network.name + '"');

  network.id = Math.random().toString(16).slice(2);

  FBP._events.push({
    type: 'register_network',
    data: {
      network: network
    }
  });

  network._processes = [];

  // give the network the processes as defined
  for (var key in network.processes) {
    var pname = network.processes[key].name;
    var cname = network.processes[key].component;
    FBP._log('Registering process: ' + pname);
    var p = FBP._instantiateProcess(pname, cname, network);

    // NOTE: network._processes not network.processes
    network._processes.push(p);
  }

  // set the first process to fire
  network._processes[0].fire = true;

  // wire up the processes for each defined connection
  for (var key in network.connections) {
    var connectFromProcess = key.split('.')[0];
    var connectFromPort = key.split('.')[1];
    var connectToProcess = network.connections[key].split('.')[0];
    var connectToPort = network.connections[key].split('.')[1];

    // find the process
    var process = network._processes.find(p => p.name === connectFromProcess);
    if (!process) throw new Error('whoops no process found: ' + key);

    // find the port
    var port = process.outPorts.find(p => p.name === connectFromPort);
    if (!port) throw new Error('whoops no port found: ', key);

    // find the second process
    var connectedProcess = network._processes.find(p=> p.name === connectToProcess);
    if (!connectedProcess) throw new Error('whoops cannot connect: ' + key + ' to missing: ' + network.connections[key]);

    // find the second process's port to connect to
    var connectedPort = connectedProcess.inPorts.find(p => p.name === connectToPort);
    if (!connectedPort) throw new Error('whoops missing ' + network.connections[key] + ' port for: ' + process.name);

    // connect the two processes
    port.connectedTo = connectedPort;
  }

  FBP._networks.push(network);

  FBP.runPlugins();
  FBP.clearEvents();

  return network;
};

/**
 * Activate all processes with full inputs
 * @param {network} network - A network to process
 */
FBP.step = function (network) {

  if (Object.keys(FBP._ips).length == 0) {
    FBP._log('no more ips in flight... stopping network');
    network.running = false;
    return null;
  }

  if (FBP._maxSuspends > FBP._suspendsLimit) {
    FBP._log('maximum # of suspends reached! ', FBP._suspendCounts);
    network.running = false;
  }

  var process = network._processes.find(function (p) {
    return p.fire;
  });

  // no more processes, so loop around to first
  if (!process) {
    network._processes[0].fire = true;
    return;
  }

  process.suspend = false;

  // every inport must have data, or an IP
  // note if node is a 'generator', and does not have input ports, this part
  // is skipped anyway, so no worries
  for (var y = 0; y < process.inPorts.length; y++) {
    if (process.inPorts[y].data.length === 0) {
      process.suspend = true;
      break;
    }
  }

  // if not all inputs have data, then suspend this process
  if (process.suspend) {

    // recording # of suspends for this process, and max suspends for the runtime
    FBP._suspendCounts[process.name] = FBP._suspendCounts[process.name] ? FBP._suspendCounts[process.name] + 1 : 1;
    if (FBP._maxSuspends < FBP._suspendCounts[process.name]) {
      FBP._maxSuspends = FBP._suspendCounts[process.name];
    }

    FBP.fireNextProcess(process, network);

    return;
  };

  // otherwise collect the args for the component
  var args = [];

  // NOTE: the collecting of input ports and output ports must be
  // done in this order. By convention, input ports are listed
  // first in the component function, and output ports are listed last

  // collect input ports
  // again, if node is a 'generator', and has no inputs, then this part
  // is skipped, which is just fine
  if (process.inPorts) {
    for (var i = 0; i < process.inPorts.length; i++) {
      var ip = process.inPorts[i].data.shift();

      // if IP not null
      if (ip) {
        // deduct previous process's IP count
        if (ip.holdingProcess) {
          ip.holdingProcess.ipCount--;
        }

        FBP._log('IP with ID ' + ip.id + ' moving from ' + (ip.holdingProcess ? ip.holdingProcess.name : 'unknown (probably just created)') + ' to ' + process.name);

        FBP._events.push({
          type: 'move_ip',
          data: {
            ip: ip,
            previous_process: ip.holdingProcess,
            new_process: process
          }
        });

        // set ip's new holding process
        ip.holdingProcess = process;

        // increment new process's IP count
        process.ipCount++;

      }

      // get the next IP, even if null
      args.push(ip);
    }

  }

  // collect output ports
  // note if the node is a 'sink' and has no output ports, this part is
  // skipped, which is fine
  if (process.outPorts) {
    for (var j = 0; j < process.outPorts.length; j++) {
      // the 'output port' is just the input port of the next process
      var inputPort = process.outPorts[j].connectedTo;
      var output = inputPort.data;
      args.push(output);
    }
  }

  // run the process's component

  FBP._events.push({
    type: 'firing_process',
    data: {
      process: process
    }
  });

  process.body.apply(process, args);

  FBP.fireNextProcess(process, network);
};

/**
 * Don't fire this process next time, fire the next one
 */
FBP.fireNextProcess = function (process, network) {
  process.fire = false;
  var nextProcess = network._processes[network._processes.indexOf(process) + 1];
  if (nextProcess) {
    nextProcess.fire = true;
  } else {
    network._processes[0].fire = true;
  }
};

/**
 * Loop the stepping function
 * @param {network} network - A network to operate
 */
FBP.loop = function (network) {
  var id = setTimeout(function () {
    if (!network.running) {
      clearTimeout(id);
      FBP._log('Network "' + network.name + '" stopped. FBP._ips: ', Object.keys(FBP._ips));
      FBP._log('DONE');

      FBP._events.push({
        type: 'stopping_network',
        data: {
          network: network
        }
      });

    } else {
      FBP.step(network);
      FBP.loop(network);
      FBP.runPlugins();
      FBP.clearEvents();
    }
  }, network.delay || 0); // optional delay
};

/**
 * Run a network. expects initial input ports and their initial values
 * @param {string} networkName - The name of the network
 * @param {obj} init - The initial input values if needed
 * @param {boolean} debug - To debug or not to debug
 */
FBP.go = function (networkName, init, debug) {

  FBP._log('running network: "' + networkName + '"');

  FBP._events.push({
    type: 'running_network',
    data: {
      network: network
    }
  });

  var network = FBP._networks.find(n => n.name === networkName);

  if (!network) throw new Error('whoops... cannot find network: "' + networkName + '"');

  FBP._currentNetwork = network;

  if (debug) FBP.debug(debug);

  // push values into initial input ports
  for (var key in init) {
    var processName = key.split('.')[0];
    var portName = key.split('.')[1];

    if (!processName) throw new Error('whoops... no process name for key: ' + key)
    var process = network._processes.find(p => p.name === processName);

    // give the ports
    if (!process) throw new Error('whoops.. no process: ' + processName);
    var port = process.inPorts.find(p => p.name === portName);
    if (!port) throw new Error('whoops.. no port: ' + portName);
    var idx = process.inPorts.indexOf(port);

    if (Array.isArray(init[key])) {
      for (var i = 0; i < init[key].length; i++) {
        var iip = FBP.createIP(init[key][i]);
        process.inPorts[idx].data.push(iip);
      }
    } else {
      var iip = FBP.createIP(init[key]);
      process.inPorts[idx].data.push(iip);
    }
  }

  // now kick start the network
  network.running = true;
  FBP.loop(network);

  return network;
};

/**
 * Set the debug bool
 * @param {boolean} bool - To debug or not to debug
 */
FBP.debug = function (bool) {
  FBP._debug = bool;
};

FBP._log = function (string, args) {
  if (FBP._debug) {
    console.log(string, args || '');
  }
}

if (typeof module != 'undefined') module.exports = FBP;
