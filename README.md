#rhei.js
## A minimalist flow-based programming framework for node and the browser
If you are reading this, you are likely coming from the article ["On Flow-based Programming"](https://colab.coop/blog/how-to-start-flowing-with-flow-based-programming/).

In case you didn't read the warning at the end of that article, let me repeat it here: rhei.js is __just a toy__. It lacks many true FBP features, is not tested thoroughly, is probably riddled with bugs, and __should not be used for anything whatsoever__.

Note that the file ```rhei.js``` is the actual 'framework', everything else is just for demonstration purposes... specifically for the purposes of the article "On Flow-based Programming"

In this particular example (todo app), I am using [choo](https://choo.io/) as the display layer. You can use React or whatever you'd like.

Note also that I use ```npm config set prefix ~/.npm``` to avoid global npm installs.

NPM scripts include: ```npm run serve``` for the simple http-server ```npm run build``` for browserify-ing the client code, and ```npm run watch``` to watch the js files and re-build automatically (NOTE: requires your system to have the program ```entr```).