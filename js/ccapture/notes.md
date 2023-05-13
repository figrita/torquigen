## download.js
Included with CCapture.js

## CCapture.js
Commit e4bc8fc at https://github.com/spite/ccapture.js/tree/master/src
Added:
      if (this.settings.onProgress( progress ) === false) {
				this.encoder.abort();
			}
to abort gif renders

## gif.js & gif.worker.js
Commit 92d27a0 at https://github.com/jnordberg/gif.js/
  browserify -s GIF -t coffeeify src/gif.coffee  > dist/gif.js
  browserify -t coffeeify --bare src/gif.worker.coffee  > dist/gif.worker.js

## tar.js
Included with CCapture.js

# webm-writer-0.3.0.js
Commit 516891d at https://github.com/thenickdude/webm-writer-js/releases