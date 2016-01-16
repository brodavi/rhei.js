// These "components" are just specially shaped functions
// Note they can have multiple return callbacks

/**
 * Insert an element into a collection
 * @param {ip} coll - The collection
 * @param {ip} el - The element
 * @param {ip} idx - Index to insert into
 * @param {port} output - Output the collection
 */

FBP.component({
  name: 'insert',
  inPorts: ['coll', 'el', 'idx'],
  outPorts: ['output'],
  body: function find (coll, el, idx, output) {

    if (idx.data) {
      // either the element exists
      coll[idx.data] = el.data;
    } else {
      // or it is new
      coll.data.push(el.data);
    }

    FBP.dropIP([el, idx]);

    output.push(coll);
  }
});

/**
 * Find an element in a collection based on a key/value pair
 * @param {ip} coll - The collection
 * @param {ip} key - The key
 * @param {ip} value - The value
 * @param {port} output - Output the element
 * @param {port} outputIdx - Output the index
 */

FBP.component({
  name: 'find',
  inPorts: ['coll', 'key', 'value'],
  outPorts: ['output', 'outputIdx'],
  body: function find (coll, key, value, output, outputIdx) {
    var el = coll.data.find(function (e) {
      return e[key.data] === value.data;
    });

    var idx = coll.data.indexOf(el);

    FBP.dropIP([coll, key, value]);

    output.push(FBP.createIP(el));
    outputIdx.push(FBP.createIP(idx));
  }
});

/**
 * Drop every IP you get
 * @param {ip} anything - Anything
 */

FBP.component({
  name: 'null',
  inPorts: ['input'],
  // no outPorts! this is a sink node
  body: function find (input) {
    FBP.dropIP(input);
  }
});

/**
 * Console Log
 * @param {ip} data - The thing to log
 * @param {ip} preamble - The thing to log before the thing to log
 */

FBP.component({
  name: 'consoleLog',
  inPorts: ['preamble', 'data'],
  // no outPorts! this is a sink node.
  body: function consoleLog (preamble, data) {
    console.log(preamble.data);
    console.log(data.data);
    FBP.dropIP([preamble, data]);
  }
});

/**
 * Create a new Todo based on request
 * @param {ip} currentID - The latest ID
 * @param {ip} req - The request
 * @param {port} output - Output the new todo
 */

FBP.component({
  name: 'createTodo',
  inPorts: ['currentID', 'req'],
  outPorts: ['output'],
  body: function createTodo (currentID, req, output) {
    var newTodo = req.data.body;
    newTodo.id = currentID.data;

    FBP.dropIP([currentID, req]);

    output.push(FBP.createIP(newTodo));
  }
});

/**
 * Update an object based on request http body
 * @param {ip} obj - The object
 * @param {ip} req - The request
 * @param {port} output - Output the object
 */

FBP.component({
  name: 'update',
  inPorts: ['obj', 'req'],
  outPorts: ['output'],
  body: function update (obj, req, output) {
    var update = req.data.body;

    for (var attr in update) {
      if (update.hasOwnProperty(attr)) {
        obj.data[attr] = update[attr];
      }
    }

    FBP.dropIP(req);

    output.push(obj);
  }
});

/**
 * Delete an element from a collection
 * @param {ip} coll - The collection
 * @param {ip} el - The element
 * @param {port} output - Output the collection
 */
FBP.component({
  name: 'del',
  inPorts: ['coll', 'el'],
  outPorts: ['output'],
  body: function del (coll, el, output) {
    coll.data.splice([coll.data.indexOf(el.data)], 1);

    FBP.dropIP(el);
    output.push(coll);
  }
});

/**
 * Filter a collection based on a key and a filter string
 * @param {ip} filterString - The fitler string
 * @param {ip} coll - The collection
 * @param {port} output - The output port callback
 */
FBP.component({
  name: 'filter',
  inPorts: ['coll', 'key', 'filterString'],
  outPorts: ['output'],
  body: function search (coll, key, filterString, output) {

    if (filterString.data && filterString.data != '') {
      coll.data = coll.data.filter(
        function (el) {
          var queries = filterString.data.split(',');
          var results = queries.map(s => el[key.data].indexOf(s) != -1);
          return results.some(r => r);
        }
      );
    }

    // we just manipulate the list of things that came to us.
    // no more need for the filter string or key.
    FBP.dropIP([filterString, key]);

    output.push(coll);
  }
});

/**
 * Send a response to the client
 * @param {ip} data - The data to send to the client
 * @param {ip} res - The response object
 */
FBP.component({
  name: 'sendResponse',
  inPorts: ['data', 'res'],
  // no outPorts! this is a sink node
  body: function sendResponse (data, res) {

    // Side effect!
    console.log('sent response: ', data.data);

    if (typeof data.data == 'object') {
      res.data.json(data.data);
    } else {
      res.data.end(data.data);
    }

    FBP.dropIP([data, res]);
  }
});

/**
 * Generic node.js http request component
 * @param {ip} http - The node http library
 * @param {ip} hostname - The server
 * @param {ip} path - The request path
 * @param {ip} method - The method
 * @param {ip} headers - The request headers
 * @param {ip} data - Optional data (if sending)
 * @param {port} output - The output port callback
 * @param {port} outputErr - The output erro port callback
 */
FBP.component({
  name: 'serverRequest',
  inPorts: ['http', 'hostname', 'path', 'method', 'headers', 'data'],
  outPorts: ['output', 'outputErr'],
  body: function request (http, hostname, path, method, headers, data, output, outputErr) {
    var req = http.data.request({
      hostname: hostname.data,
      path: path.data,
      method: method.data,
      headers: headers,data
    }, function (res) {
      var body = '';
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        body += chunk;
      });
      res.on('end', function() {
        output.push(FBP.createIP(body));
        FBP.dropIP([http, hostname, path, method, headers, data]);
      });
    }).on('error', function (e) {
      outputErr.push(FBP.createIP(e));
      FBP.dropIP([http, hostname, path, method, headers, data]);
    });

    if (data.data) {
      req.write(data);
    }
    req.end();
  }
});

/**
 * Generic ajax request component
 * @param {ip} url - The url
 * @param {ip} method - The method
 * @param {ip} data - Optional data (if sending)
 * @param {port} output - The output port callback
 */
FBP.component({
  name: 'ajax',
  inPorts: ['url', 'method', 'data'],
  outPorts: ['output', 'outputErr'],
  body: function ajax (url, method, data, output, outputErr) {
    var u = url.data;
    var m = method.data;
    var d = data.data;

    var request = new XMLHttpRequest();
    request.open(m, u, true);

    if (d) {
      request.setRequestHeader('Content-type', 'application/json');
    }

    request.onload = function () {
      if (request.status >= 200 && request.status < 400) {
        var response = JSON.parse(request.responseText);

        // output the new thing from the server
        output.push(FBP.createIP(response));
      } else {
        outputErr.push(FBP.createIP(request.responseText));
      }
    };

    request.onerror = function () {
      output.push(FBP.createIP('error'));
    };

    // no matter what else happens, success or error, the incoming things
    // no longer have meaning. get rid of them.
    FBP.dropIP([url, method, data]);

    if (data) {
      request.send(JSON.stringify(d));
    } else {
      request.send();
    }
  }
});

/**
 * Create ToDo list DIV
 * @param {ip} todos - A list of ToDos
 * @param {port} output - The output port for the HTML
 */
FBP.component({
  name: 'buildToDoList',
  inPorts: ['todos'],
  outPorts: ['output'],
  body: function buildToDoList (todos, output) {
    var list = document.createElement('div');
    list.classList.add('todolist');

    for (var x = 0; x < todos.data.length; x++) {
      var todo = todos.data[x];

      var div = document.createElement('div');
      div.classList.add('todo');

      var remove = document.createElement('span');
      remove.classList.add('remove');
      remove.dataset.id = todo.id;
      remove.onclick = runDelete;
      remove.innerHTML = '×';
      div.appendChild(remove);

      var task = document.createElement('span');
      task.classList.add('task');
      task.innerHTML = todo.task;
      div.appendChild(task);

      var status = document.createElement('span');
      status.classList.add('status');
      status.innerHTML = todo.status;
      status.dataset.id = todo.id;
      status.onclick = runToggleStatus;
      div.appendChild(status);

      list.appendChild(div);
    }

    // manipulating the thing that came to us. it was a raw array of todos
    // now it is a collection of DOM elements. still a list of todos, but
    // in different form. we pass it along the conveyer belt.
    todos.data = list;
    output.push(todos);
  }
});

/**
 * Replace a DOM element's innerHTML
 * @param {ip} content - The HTML to replace the content with
 * @param {ip} target - The target ID whose content we will replace
 */
FBP.component({
  name: 'replace',
  inPorts: ['content', 'target'],
  // no outPorts! this is a sink node
  body: function replace (content, target) {
    var c = content.data;
    var t = target.data;

    var targetEl = document.getElementById(t);

    // if it is just a string (like an error), wrap it in a div
    var html;
    if (typeof c === 'object') {
      html = c;
    } else {
      html = document.createElement('div');
      html.innerHTML = c;
    }

    // DOM manipulation!
    targetEl.innerHTML = '';
    targetEl.appendChild(html);

    FBP.dropIP([content, target]);

    return null;
  }
})

/**
 * Create 2 IPs from 1 (manual splitting)
 * @param {ip} data - The data
 * @param {ip} output1 - The first output
 * @param {ip} output2 - The second output
 */
FBP.component({
  name: 'split',
  inPorts: ['data'],
  outPorts: ['output1', 'output2'],
  body: function store (data, output1, output2) {

    output1.push(FBP.createIP(data.data));
    output2.push(FBP.createIP(data.data));

    // drop original IP
    FBP.dropIP(data);
  }
});

/**
 * Save some data to localstorage
 * @param {ip} data - The data
 * @param {ip} key - The key to save the data under
 */
FBP.component({
  name: 'store',
  inPorts: ['data', 'key'],
  // no outPorts! this is a sink node!
  body: function store (data, key) {

    // side effect! we mutate localStorage
    window.localStorage.setItem(key.data, JSON.stringify(data.data));

    FBP.dropIP([data, key]);

    return null;
  }
});

/**
 * Get some data to localstorage
 * @param {ip} key - The key to get the data from
 * @param {port} output - The output port callback
 */
FBP.component({
  name: 'retrieve',
  inPorts: ['key'],
  outPorts: ['output'],
  body: function retrieve (key, output) {
    var k = key.data;

    // we are a 'transforming' machine. we take in a key and give data
    var data = JSON.parse(window.localStorage.getItem(k));

    // no more need for the key
    FBP.dropIP(key);

    // pass along the new thing
    output.push(FBP.createIP(data));
  }
});

/**
 * Filter the todos that are done
 * @param {ip} todos - A list of ToDos from the server
 * @param {port} output - The output port callback
 */
FBP.component({
  name: 'onlyDone',
  inPorts: ['todos'],
  outPorts: ['output'],
  body: function onlyDone (todos, output) {
    todos.data = todos.data.filter(t => t.status === 'done');
    output.push(todos);
  }
});
