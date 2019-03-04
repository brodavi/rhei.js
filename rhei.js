/**
 * rhei.js
 * David Brooks
 * MIT License
*/

FBP = {}
FBP._components = []
FBP._networks = []
FBP._processes = []

/**
 * Set the debug bool
 * @param {boolean} bool - To debug or not to debug
 */
FBP.debug = function (bool) {
  FBP._debug = bool
}

/**
 * Set the maximum ignore count
 * @param {int} maxignore - How much ignoring can we stand?
 */
FBP.maxIgnore = function (maxignore) {
  FBP._maxIgnore = maxignore
}

/**
 * Log (if debugging)
 */
FBP.log = function log (msg) {
  if (FBP._debug) {
    console.log(msg)
  }
}

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
FBP.registerComponent = function (component) {
  FBP._components.push(component)
}

/**
 * Takes a component and turns it into a running process
 * @param {string} pname - A process name
 * @param {string} cname - A component name
 */
FBP._instantiateProcess = function (pname, cname) {
  const component = FBP._components.find(c => c.name === cname)

  if (!component) throw new Error(`whoops no component: ${cname}`)

  // giving inports data
  const newInports = component.inPorts.map((p) => {
    return {
      name: p,
      thisProcessName: pname,
      data: []
    }
  })

  // giving outports data
  const newOutports = component.outPorts.map((p) => {
    return {
      name: p,
      connectedTo: null,
      data: []
    }
  })

  const process = {
    processName: pname,
    name: component.name,
    inPorts: newInports,
    outPorts: newOutports,
    body: component.body
  }

  FBP.log(`Registering process: ${pname}`)

  return process
}

/**
 * Create an Information Packet
 * @param {anything} data - A data packet's data
 *
 * Can be strings, numbers, objects anything really.
 */
FBP.createIP = function (data) {
  return {
    id: Math.random().toString(16).slice(2),
    data: data
  }
}

/**
 * Drop an Information Packet
 * @param {IP} ip - An Information Packet
 */
FBP.dropIP = function (ip) {
  ip = null
}

/**
 * Register a network with the runtime
 * TODO: let's make this where there is no need to "kickstart" the network...
 *   rather the network should just start running, and "kickstart" itself when
 *   the left-hand side processes have all their inputs. then the network runs..
 *   .. until it hits a place where not all inputs are filled (from left to right)
 *   .. and waits there until it has all inputs, then continues.
 *   ..... in practice this means the networks are always "running", and when
 *   an input from the user occurs (keypress, mouseclick, REST call, etc) then
 *   the network runs as you'd expect.
 *
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
FBP.registerNetwork = function (network) {
  FBP.log('Registering network: "' + network.name + '"')

  network._processes = []

  // give the network the processes as defined
  for (let key in network.processes) {
    const pname = network.processes[key].name
    const cname = network.processes[key].component

    if (network._processes.find(p => p.processName === pname)) {
      throw new Error(`whoops you have two processes with the same name: ${pname} in network: ${network.name}`)
    }

    const p = FBP._instantiateProcess(pname, cname)

    // NOTE: network._processes not network.processes
    network._processes.push(p)
  }

  // wire up the processes for each defined connection
  for (let key in network.connections) {

    // find the process
    const process = network._processes.find(p => p.processName === key.split('.')[0])
    if (!process) {
      throw new Error(`whoops no process found: ${key.split('.')[0]} in network: ${network.name}`)
    }

    // find the port
    const port = process.outPorts.find(p => p.name === key.split('.')[1])
    if (!port) throw new Error(`whoops no port found: ${key}`)

    // find the second process
    const connectedProcess = network._processes.find(p=> p.processName === network.connections[key].split('.')[0])
    const cannotConnectPort = key + '.' + network.connections[key].split('.')[1]
    if (!connectedProcess) throw new Error(`whoops cannot connect: ${cannotConnectPort} to missing:  ${network.connections[key]}`)

    // find the second process's port to connect to
    const connectedPort = connectedProcess.inPorts.find(p => p.name === network.connections[key].split('.')[1])
    if (!connectedPort) throw new Error(`whoops missing ${network.connections[key]} port for: ${process.name}`)

    // connect the two processes
    port.connectedTo = connectedPort
  }

  FBP._networks.push(network)
  return network
}

/**
 * Activate all processes with full inputs
 * @param {network} network - A network to process
 */
FBP.step = function (network) {

  // every network process
  for (let x = 0; x < network._processes.length; x++) {
    const process = network._processes[x]
    let ignore = false

    // every inport must have data
    for (let y = 0; y < process.inPorts.length; y++) {
      if (process.inPorts[y].data.length === 0) {
        ignore = true;
        break
      }
    }

    // "halt" this process if not all inputs have data
    if (ignore) {
      FBP._ignoreCount++ // count the number of times any process
                         // has been ignored (for debugging)
      continue
    }

    // otherwise collect the args for the component
    const args = []

    // NOTE: the collecting of input ports and output ports must be
    // done in this order. By convention, input ports are listed
    // first in the component function, and output ports are listed last

    // collect input ports
    for (let i = 0; i < process.inPorts.length; i++) {
      const ip = process.inPorts[i].data.shift()

      // get the next IP
      args.push(ip)
    }

    // collect output ports
    for (let j = 0; j < process.outPorts.length; j++) {
      const connection = process.outPorts[j].connectedTo
      // pushing the callback for the output
      const output = FBP._makeOutput(process, connection)
      args.push(output)
    }

    // run the process's component
    process.body.apply(process, args)
  }
}

/**
 * Create an output callback
 * @param {process} currentProcess - A process with an output
 * @param {port} connection - An input port on a process
 */
FBP._makeOutput = function (currentProcess, connection) {
  return function (output) {
    if (!connection) {
      FBP.log(`an output from: ${currentProcess.name} is missing a destination`)
    } else {
      FBP.log(`pushing ip: ${JSON.stringify(output)} from: ${currentProcess.name} onto ${connection.thisProcessName}.${connection.name}`)

      // we need to take this output IP and put it into
      // the the connected process's input port
      connection.data.push(output)
    }
  }
}

/**
 * Loop the stepping function
 * @param {network} network - A network to operate
 */
FBP.loop = function (network) {
  var id = setTimeout(function () {
    if (!network.running || FBP._ignoreCount > FBP._maxIgnore) {
      clearTimeout(id)
      FBP.log(`Network "${network.name}" stopped. FBP._ignoreCount: ${FBP._ignoreCount}`)
      FBP._ignoreCount = 0
      return
    } else {
      FBP.step(network)
      FBP.loop(network)
    }
  }, network.delay || 0) // optional delay
}

/**
 * Run a network. expects initial input ports and their initial values
 * @param {string} networkName - The name of the network
 * @param {obj} init - The initial input values if needed
 * @param {boolean} debug - To debug or not to debug
 */
FBP.go = function (networkName, init, debug) {
  if (debug) FBP.debug(debug)

  FBP.log(`\n\nrunning network: "${networkName}"`)

  const network = FBP._networks.find(n => n.name === networkName)

  if (!network) throw new Error(`whoops... cannot find network: "${networkName}"`)

  FBP._currentNetwork = network

  // push values into initial input ports
  for (let key in init) {
    const processName = key.split('.')[0]
    const portName = key.split('.')[1]

    if (!processName) throw new Error(`whoops... no process name for key: ${key}`)
    const process = network._processes.find(p => p.processName === processName)

    // give the ports
    if (!process) throw new Error(`whoops.. no process: ${processName}`)
    const port = process.inPorts.find(p => p.name === portName)
    if (!port) throw new Error(`whoops.. no port: ${portName}`)
    const idx = process.inPorts.indexOf(port)

    const iip = FBP.createIP(init[key])
    process.inPorts[idx].data.push(iip)
  }

  // now kick start the network
  network.running = true
  FBP.loop(network)

  return network
}

if (typeof module !== 'undefined') module.exports = FBP
