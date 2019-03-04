// These "components" are just specially shaped functions
// Note they can have multiple return callbacks

/**
 * Trash incoming packets
 * @param {ip} data - The information packet to trash
 */

FBP.registerComponent({
  name: 'trash',
  inPorts: ['data'],
  outPorts: [''],
  body: function trash (data) {
    FBP.dropIP(data)
  }
})

/**
 * Focus on some incoming data
 * @param {ip} data - The initial data to provide focus on
 * @param {ip} focus - What to focus on (can be single or array)
 * @param {port} output - Output the focused data
 * @param {port} outputErr - Output in case of error
 */

FBP.registerComponent({
  name: 'focus',
  inPorts: ['data', 'focus'],
  outPorts: ['output', 'outputErr'],
  body: function fun (data, focus, output, outputErr) {
    let foci = data.data
    for (let x = 0; x < focus.length; x++) {
      foci = foci[focus[x]]
    }
    if (!foci) {
      outputErr(FBP.createIP(`whoops error focusing on ${data.data}`))
    } else {
      output(FBP.createIP(foci))
    }
  }
})

/**
 * Inject an IP
 * @param {ip} ip - The information packet to inject
 * @param {ip} on - The signal to send the IP. Anything arriving here will trigger the IP inject
 * @param {port} output - Output the IP
 */

FBP.registerComponent({
  name: 'inject',
  inPorts: ['ip', 'on'],
  outPorts: ['output'],
  body: function inject (ip, on, output) {
    output(ip)
  }
})

/**
 * Send data to console.og
 * @param {ip} in - The data
 * @param {port} output - Pass along the data
 */

FBP.registerComponent({
  name: 'log',
  inPorts: ['input'],
  outPorts: ['output'],
  body: function log (input, output) {
    console.log(input)
    output(input)
  }
})

/**
 * Insert an element into a collection
 * @param {ip} coll - The collection
 * @param {ip} el - The element
 * @param {ip} idx - Index to insert into
 * @param {port} output - Output the collection
 */

FBP.registerComponent({
  name: 'insert',
  inPorts: ['coll', 'el', 'idx'],
  outPorts: ['output'],
  body: function insert (coll, el, idx, output) {
    if (idx.data) {
      // either the element exists
      coll[idx.data] = el.data
    } else {
      // or it is new
      coll.data.push(el.data)
    }

    FBP.dropIP(el)
    FBP.dropIP(idx)

    output(coll)
  }
})

/**
 * Find an element in a collection based on a key/value pair
 * @param {ip} coll - The collection
 * @param {ip} key - The key
 * @param {ip} value - The value
 * @param {port} output - Output the element
 * @param {port} outputIdx - Output the index
 * @param {port} outputErr - Can't find the thing
 */

FBP.registerComponent({
  name: 'find',
  inPorts: ['coll', 'key', 'value'],
  outPorts: ['output', 'outputIdx', 'outputErr'],
  body: function find (coll, key, value, output, outputIdx, outputErr) {
    var el = coll.data.find(function (e) {
      return e[key.data] === value.data
    })

    if (!el) {
      outputErr(FBP.createIP(`cannot find with key ${key} value: ${value}`))
    } else {
      var idx = coll.data.indexOf(el)

      output(FBP.createIP(el))
      outputIdx(FBP.createIP(idx))
    }

    FBP.dropIP(coll)
    FBP.dropIP(key)
    FBP.dropIP(value)
  }
})

/**
 * Update an object based on another object
 * @param {ip} obj - The object
 * @param {ip} obj2 - The other object
 * @param {port} output - Output the updated object
 */

FBP.registerComponent({
  name: 'update',
  inPorts: ['obj', 'obj2'],
  outPorts: ['output'],
  body: function update (obj, obj2, output) {
    const update = obj2.data

    for (var attr in update) {
      if (update.hasOwnProperty(attr)) {
        obj.data[attr] = update[attr]
      }
    }

    FBP.dropIP(obj2)

    output(obj)
  }
})

/**
 * Delete an element from a collection
 * @param {ip} coll - The collection
 * @param {ip} el - The element
 * @param {port} output - Output the collection
 */
FBP.registerComponent({
  name: 'deleteElement',
  inPorts: ['coll', 'el'],
  outPorts: ['output'],
  body: function deleteElement (coll, el, output) {
    coll.data.splice(coll.data.indexOf(el.data), 1)

    FBP.dropIP(el)

    output(coll)
  }
})

/**
 * Filter a collection based on a key and something to filter on
 * @param {ip} filterOn - What to filter on (can be numbers or strings... singular or an array)
 * @param {ip} key - The key to look at for filterOn
 * @param {ip} coll - The collection
 * @param {port} output - The output port
 */
FBP.registerComponent({
  name: 'filter',
  inPorts: ['coll', 'key', 'filterOn'],
  outPorts: ['output'],
  body: function filter (coll, key, filterOn, output) {
    let newColl = []
    if (!filterOn.data || filterOn.data === '') {
      newColl = coll.data.slice() // just copy the array if no filter
    } else {
      newColl = coll.data.filter(
        function (element) {
          if (isNaN(filterOn.data)) { // if not a number
            const queries = filterOn.data.split(',') // arr of filter strings
            const results = queries.map(s => element[key.data].indexOf(s) !== -1) // match any of the strings
            return results.some(r => r) // if any results are true, return true
          } else { // if a number
            return element[key.data] === filterOn.data
          }
        }
      )
    }

    // we just manipulate the list of things that came to us.
    // no more need for the filter string or key.
    FBP.dropIP(filterOn)
    FBP.dropIP(key)
    FBP.dropIP(coll)

    output(FBP.createIP(newColl))
  }
})

/**
 * Send an HTTP response to the client NOTE: server only
 * @param {ip} data - The data to send to the client
 * @param {ip} res - The response object
 */
FBP.registerComponent({
  name: 'sendHTTPResponse',
  inPorts: ['data', 'res'],
  outPorts: ['output'],
  body: function sendHTTPResponse (data, res, output) {
    FBP.log(`sent response: ${data.data}`)
    res.data.json(data.data)

    FBP.dropIP(res)

    output(data.data)
  }
})

/**
 * Send an HTTP request to a server NOTE: server only
 * @param {ip} nodeHTTP - Node's HTTP package
 * @param {ip} url - The url
 * @param {ip} method - The method
 * @param {ip} data - Optional data (if sending)
 * @param {port} output - The output port
 * @param {port} outputErr - The output error port
 */
FBP.registerComponent({
  name: 'sendHTTPRequest',
  inPorts: ['nodeHTTP', 'url', 'method', 'data'],
  outPorts: ['output', 'outputErr'],
  body: function sendHTTPRequest (nodeHTTP, url, method, data, output, outputErr) {
    const u = url.data
    const m = method.data
    const d = data.data
    const http = nodeHTTP.data

    const hostname = u.split('/')[3]
    const path = u.split(hostname)[1]

    const postData = d

    const options = {
     hostname: hostname,
     port: 80,
     path: path,
     method: m
    }

    let outData = []

    const req = http.request(options, (res) => {
     FBP.log(`STATUS: ${res.statusCode}`)
     FBP.log(`HEADERS: ${JSON.stringify(res.headers)}`)
     res.setEncoding('utf8')
     res.on('data', (chunk) => {
       FBP.log(`BODY: ${chunk}`)
       outData.push(chunk)
     })
     res.on('end', (e) => {
       FBP.log('No more data in response.')
       output(FBP.createIP(outData.join('')))
     })
    })

    req.on('error', (e) => {
     FBP.log(`problem with request: ${e.message}`)
     outputErr(FBP.createIP(e.message))
    })

    // write data to request body
    req.write(postData)
    req.end
  }
})

/**
 * Generic ajax request component NOTE: browser only
 * @param {ip} url - The url
 * @param {ip} method - The method
 * @param {ip} data - Optional data (if sending)
 * @param {port} output - The output port
 * @param {port} outputErr - The output error port
 */
FBP.registerComponent({
  name: 'ajax',
  inPorts: ['url', 'method', 'data'],
  outPorts: ['output', 'outputErr'],
  body: function ajax (url, method, data, output, outputErr) {
    const u = url.data
    const m = method.data
    const d = data.data

    const request = new XMLHttpRequest()
    request.open(m, u, true)

    if (d) {
      request.setRequestHeader('Content-type', 'application/json')
    }

    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        const response = JSON.parse(request.responseText)

        // output the new thing from the server
        output(FBP.createIP(response))
      } else {
        // probably got a 401, 404, etc...
        outputErr(FBP.createIP(request.responseText))
      }
    }

    request.onerror = function () {
      FBP.log(`request failed: ${u}`) // actual error... server not found or something
      outputErr(FBP.createIP(`request failed: ${u}`))
    }

    // no matter what else happens, success or error, the incoming things
    // no longer have meaning. get rid of them.
    FBP.dropIP(url)
    FBP.dropIP(method)
    FBP.dropIP(data)

    if (d) {
      request.send(JSON.stringify(d))
    } else {
      request.send()
    }
  }
})

/**
 * Save some data to localstorage NOTE: browser only
 * @param {ip} data - The data
 * @param {ip} key - The key to save the data under
 * @param {port} output - The output port
 */
FBP.registerComponent({
  name: 'localStorageStore',
  inPorts: ['data', 'key'],
  outPorts: ['output'],
  body: function localStorageStore (data, key, output) {
    const d = data.data
    const k = key.data

    // we mutate localStorage and pass along the things
    window.localStorage.setItem(k, JSON.stringify(d))

    // no need for the key anymore
    FBP.dropIP(key)

    output(data)
  }
})

/**
 * Get some data to localstorage NOTE: browser only
 * @param {ip} key - The key to get the data from
 * @param {port} output - The output port
 */
FBP.registerComponent({
  name: 'localStorageRetrieve',
  inPorts: ['key'],
  outPorts: ['output'],
  body: function localStorageRetrieve (key, output) {
    const k = key.data

    // we are a 'transforming' machine. we take in a key and give data
    const data = JSON.parse(window.localStorage.getItem(k))

    // no more need for the key
    FBP.dropIP(key)

    // pass along the new thing
    output(FBP.createIP(data))
  }
})
