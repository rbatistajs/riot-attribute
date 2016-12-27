
const __TAG_IMPL = {}, // tags implementation cache
  __ATTR_IMPL = {}, // Attributes implementation cache
  __ATTR_CACHE = [] // Attributes instance cache

var ready = false,
    nextId = -1

// Válida se contém o attributo instanciado no elemento
__ATTR_CACHE.contains = function(dom, attr){
    var index = this.indexOf(dom)
    if(index === -1 || !dom._attr)
        return false

    return dom._attr[attr]
}

// loops array and elements
const each = function() {
    Array.prototype.forEach.call(...arguments)
}

// get tag implementation
function getTag(dom){
  return dom.tagName && __TAG_IMPL[dom.getAttribute('data-is') ||
  dom.getAttribute('data-is') || dom.tagName.toLowerCase()]
}

// altera o valor da propriedade de um object
// aparti do caminho passado
const setProperty = function(o, s, v) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    var a = s.split('.');
    for (var i = 0, n = a.length; i < n; ++i) {
        var k = a[i];
        if (k in o) {
            if(i == n-1){
                Object.defineProperty(o, k, {
                  'value': v
                })
            }
            o = o[k];
        } else {
            return;
        }
    }
    return o;
}


// Attr Constructor
function Attr(attr, expr, parent){
  var self = this,
      propsInSyncWithParent = []

  parent = this.parent

  each(Object.keys(parent), (key) => {
      if(self.hasOwnProperty(key))
          return

      Object.defineProperty(self, key, {
          get: function(){
              return parent[key]
          },
          set: function(value){
              parent[key] = value
          }
      })
  })

  var $inst = Object.create(attr.opts)

  var attribute = {
      name: attr.name,
      get value(){
          return riot.util.tmpl(expr, self)
      },
      set value(v){
          var m = new RegExp("{([\\w\\. \\[\\]']*)}").exec(expr)
          if(m && m[1]){
              setProperty(self, m[1], v)
          }
      }
  }

  $inst.init.apply(self, [self.root, attribute])

  self._attr = $inst
  self.root._attr = self.root._attr || {}
  self.root._attr[attr.name] = self

  if(__ATTR_CACHE.indexOf(self.root) === -1)
      __ATTR_CACHE.push(self.root)

  self.on('unmount', function(){
      var index = __ATTR_CACHE.indexOf(self.root)

      if(index){
          __ATTR_CACHE.splice(index, 1)
      }
  })
}

function parseAttrInTag(attr, tag) {
  var vdom = document.createElement('div'),
  elems = [],
  refs = []

  vdom.innerHTML = tag.tmpl
  elems = vdom.querySelectorAll('['+attr.name+']')

  each(elems, (dom) =>{
    nextId++
    var isTag = getTag(dom) || dom.getAttribute('data-is'),
    ref = {
        id: '__'+attr.name+'__id__'+nextId,
        tmpl: attr.tmpl || dom.innerHTML,
        expr: dom.getAttribute(attr.name),
        attr: attr
    }

    if(!isTag){
      dom.setAttribute('data-is', ref.id)
      rTag2(ref.id, ref.tmpl, '', '', function(){
        Attr.apply(this, [ref.attr, ref.expr])
      })
    }else{
      dom.setAttribute(ref.id, '')
      refs.push(ref)
    }

  })

  tag.tmpl = vdom.innerHTML

  if(refs.length){
    var cacheFn = tag.fn

    tag.fn = function() {
      var self = this

      const mountAttr = (dom, ref, update) => {
          if(!dom._tag){
              rTag2(ref.id, ref.tmpl, '', '', function(){
                  var attr = Attr.apply(this, [ref.attr, ref.expr, self])
                  if(update)
                      self.update()
              })
              util.tags.mountTo(dom, ref.id, {}, {})
              riot.unregister(ref.id)
          }else{
              Attr.apply(dom._tag, [ref.attr, ref.expr, self])
              if(update)
                  self.update()
          }
      }

      self.on('mount', function(){
          each(refs, (ref) => {
              var elms = this.root.querySelectorAll('['+ref.id+']')
              each(elms, (dom) => {
                  if(dom)
                      mountAttr(dom, ref, true)
              })
          })
      })

      self.on('update', function(){
          setTimeout(() => {
              each(refs, (ref) => {
                  var elms = self.root.querySelectorAll('['+ref.id+']')
                  each(elms, (dom) => {
                      if(dom && dom._tag)
                          dom._tag.update()
                  })

              })
          })
      })

      self.on('updated', function(){
          each(refs, (ref) => {
              var elms = this.root.querySelectorAll('['+ref.id+']')
              each(elms, (dom) => {
                  if(dom && !__ATTR_CACHE.contains(dom, ref.attr.name))
                      mountAttr(dom, ref, true)
              })
          })
      })

      if(cacheFn)
        cacheFn.apply(this, arguments)
    }
  }

  return tag
}


function parseAttrsInTags() {
  each(Object.keys(__TAG_IMPL), (key) => {
    var impl = __TAG_IMPL[key]

    each(Object.keys(__ATTR_IMPL), (i) => {
      impl = parseAttrInTag(__ATTR_IMPL[i], impl)
    })
    rTag2.apply(riot, Object.keys(impl).map(i=>impl[i]))
  })
}


function selectAttrs(attrs) {

    if(!attrs){
        return selectAttrs(Object.keys(__ATTR_IMPL))
    }

    attrs.unshift(null)

    return attrs
    .reduce((list, a) => {
        var attr = '['+a.trim().toLowerCase()+']'
        if(!list)
            return attr
        return list+','+attr
    })
}

// cria tags apartir do attributo
function createAttrTag(attr, el, target) {
    nextId++
    var ref = '__'+attr.name+'__id__'+nextId

    rTag2(ref, attr.opts.tmpl || el.innerHTML, '', '', function(){
        Attr.apply(this, [attr, el.getAttribute(attr.name), target])
    })

    return ref
}

// monta os custom attributos passados
riot.mountAttr = function(selector){
    if(selector === "*")
        selector = selectAttrs()
    else
        selector = selectAttrs(selector.split(/, */))

    var elements = document.querySelectorAll(selector)

    each(elements, (el) => {
        Object.keys(__ATTR_IMPL).forEach((name) => {
            if(!el.hasAttribute(name))
                return
            var attr = __ATTR_IMPL[name];

            if(attr.opts.compile)
                attr.opts.compile.apply(attr.opts, [el, el._tag])

            if(el._tag){

                if(__ATTR_CACHE.contains(el, attr.name)){
                  return;
                }

                if(attr.opts.tmpl){
                    var dom = document.createElement('span')
                    var ref = createAttrTag(attr, el, {})

                    dom.appendChild(el.cloneNode(true))

                    if(attr.opts.target){
                        try {
                            document.querySelector(attr.opts.target).appendChild(dom)
                        } catch (e){}
                    }else{
                        el.appendChild(dom)
                    }

                    riot.util.tags.mountTo(dom, ref, {}, {})
                    riot.unregister(ref)
                }else{

                    if(attr.opts.target){
                        try {
                            document.querySelector(attr.opts.target).appendChild(el)
                        } catch (e){}
                    }
                    Attr.apply(el._tag, [attr, el.getAttribute(attr.name), el._tag])
                    el._tag.update()
                }
            }else{
                var ref = createAttrTag(attr, el, {})

                if(attr.opts.target){
                    try {
                        document.querySelector(attr.opts.target).appendChild(el)
                    } catch (e){}
                }

                riot.util.tags.mountTo(el, ref, {}, {})
                riot.unregister(ref)
            }
        })
    })
}

// cria novo custom attributo
riot.attr = (name, opts) => {
    __ATTR_IMPL[name] = {name, opts}
}

// cacheia os metodos
const rTag2 = riot.tag2,
      rTag = riot.tag,
      rMount = riot.mount

// sobrescrever metodo tag2 para guardar a implementação da tag
riot.tag2 = function(name, tmpl, css, attrs, fn) {
  var cacheFn = fn
  __TAG_IMPL[name] = {name, tmpl, css, attrs, fn}
  return name
}

// sobrescrever metodo tag para guardar a implementação da tag
riot.tag = function(name, tmpl, css, attrs, fn) {
  var cacheFn = fn
  __TAG_IMPL[name] = {name, tmpl, css, attrs, fn}
  return name
}

// sobrescrever metodo mount para fazer parse dos atributos
riot.mount = function(...args) {
  if(!ready && riot.compile){
    var ret
    riot.compile(function () {
      parseAttrsInTags()
      ret = rMount.apply(riot, args)
    })
    ready = true
    return ret
  }

  if(!ready){
    parseAttrsInTags()
    ready = true
  }

  return rMount.apply(riot, args)
}
