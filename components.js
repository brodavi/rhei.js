// These "components" are just specially shaped functions
// Note they can have multiple return callbacks

/**
 * Send data to console.og
 * @param {ip} in - The data
 * @param {port} output - Pass along the data
 */

FBP.component({
  name: 'log',
  inPorts: ['input'],
  outPorts: ['output'],
  body: function find (input, output) {
    console.log(input);
    output(input);
  }
});

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

    FBP.dropIP(el);
    FBP.dropIP(idx);

    output(coll);
  }
});

/**
 * Find an element in a collection based on a key/value pair
 * @param {ip} coll - The collection
 * @param {ip} key - The key
 * @param {ip} value - The value
 * @param {port} output - Output the element
 * @param {port} outputIdx - Output the index
 * @param {port} outputErr - Can't find the thing
 */

FBP.component({
  name: 'find',
  inPorts: ['coll', 'key', 'value'],
  outPorts: ['output', 'outputIdx', 'outputErr'],
  body: function find (coll, key, value, output, outputIdx, outputErr) {
    var el = coll.data.find(function (e) {
      return e[key.data] === value.data;
    });

    if (!el) {
      outputErr(FBP.createIP('cannot find with key ' + key + ' value: ' + value));
    } else {
      var idx = coll.data.indexOf(el);

      output(FBP.createIP(el));
      outputIdx(FBP.createIP(idx));
    }

    FBP.dropIP(coll);
    FBP.dropIP(key);
    FBP.dropIP(value);
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

    FBP.dropIP(currentID);
    FBP.dropIP(req);

    output(FBP.createIP(newTodo));
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

    output(obj);
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
    coll.data.splice(coll.data.indexOf(el.data), 1);

    FBP.dropIP(el);

    output(coll);
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
    FBP.dropIP(filterString);
    FBP.dropIP(key);

    output(coll);
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
  outPorts: ['output'],
  body: function sendResponse (data, res, output) {

    // Side effect!
    console.log('sent response: ', data.data);
    res.data.json(data.data);

    FBP.dropIP(res);

    output(data.data);
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
        output(FBP.createIP(response));
      } else {
        // output a url to visit (this contrived thing is for the article)
        outputErr(FBP.createIP('http://localhost:3030/explain'));
      }
    };

    request.onerror = function () {
      output(FBP.createIP('error'));
    };

    // no matter what else happens, success or error, the incoming things
    // no longer have meaning. get rid of them.
    FBP.dropIP(url);
    FBP.dropIP(method);
    FBP.dropIP(data);

    if (d) {
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

    /**
     * This is all actually quite ugly. We've got some DOM stuff going on
     * directly inside this component. That feels wrong. Also, the DOM mutation
     * is referring to a FBP network directly (runDelete, runToggleStatus).
     * That seems wrong too. We want to pass messages, send IPs.
     */

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
    output(todos);
  }
});

/**
 * Replace a DOM element's innerHTML
 * @param {ip} content - The HTML to replace the content with
 * @param {ip} target - The target ID whose content we will replace
 * @param {port} contentOut - Outputting the content
 * @param {port} targetOut - Outputting the target
 */
FBP.component({
  name: 'replace',
  inPorts: ['content', 'target'],
  outPorts: ['contentOut', 'targetOut'],
  body: function replace (content, target, contentOut, targetOut) {
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

    // we pass along the things that came to us (the ips, not just the data!)
    // in case someone down the line wants it
    contentOut(content);
    targetOut(target);
  }
})

/**
 * Save some data to localstorage
 * @param {ip} data - The data
 * @param {ip} key - The key to save the data under
 * @param {port} output - The output port callback
 */
FBP.component({
  name: 'store',
  inPorts: ['data', 'key'],
  outPorts: ['output'],
  body: function store (data, key, output) {
    var d = data.data;
    var k = key.data;

    // side effect! we mutate localStorage and pass along the things
    window.localStorage.setItem(k, JSON.stringify(d));

    // no need for the key anymore
    FBP.dropIP(key);

    output(data);
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
    output(FBP.createIP(data));
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
    output(todos);
  }
});
