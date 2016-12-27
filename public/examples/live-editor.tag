<live-editor>

  <!-- the empty line causes editor start from second line (on purpose) -->
  <section></section>

  <iframe src="../stage.html" ref="preview" scrolling="no"></iframe>

  <script>
    var self = this

    self.on('mount', function() {
      var editor = ace.edit(self.root.querySelector('section'))
      var doc = editor.getSession()

      editor.setTheme('ace/theme/monokai')
      doc.setMode('ace/mode/html')
      doc.setTabSize(2)
      editor.session.setUseWorker(false)
      var timer ;
      doc.on('change', function(e) {
          if(timer){
              clearTimeout(timer)
              timer = setTimeout(function(){mount(doc.getValue())}, 1000)
          }else{
              mount(doc.getValue())
              timer = 1
          }
      })
      if (window.location.hash)
        doc.setValue(decodeURIComponent(window.location.hash.substring(1)))
      else
        get(opts.src, function(tag) { doc.setValue(tag) })


    })

    function mount(tag) {
      // reload the iframe
      self.refs.preview.src = self.refs.preview.src
      self.refs.preview.onload = function() {
        //window.location.hash = encodeURIComponent(tag)
        self.refs.preview.contentWindow.postMessage(tag, '*')
      }
    }

    function get(url, fn) {
      var req = new XMLHttpRequest()
      req.onreadystatechange = function() {
        if (req.readyState == 4 && (req.status == 200 || (!req.status && req.responseText.length)))
          fn(req.responseText)
      }
      req.open('GET', url, true)
      req.send('')
    }
  </script>

  <style>
    :scope {
      display: block;
      height: 100vh;
      overflow: hidden;
    }
    iframe {
      display: inline-block;
      vertical-align: top;
      padding-left: 1em;
      color: #333;
      border: none;
      height: 100vh;
    }
    section {
      height: 150px;
    }
    @media (min-width: 500px) {
      iframe {
        width: 45%;
      }
      section {
        height: 100vh;
        display:inline-block;
        width: 50%;
      }
    }
  </style>

</live-editor>
