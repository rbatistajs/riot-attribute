const util = riot.util
const REGEX_ATTR = '=?(?:"([^"]*)"|\'([^\']*)\'|({[^}]*}))?'

let __ATTR_IMPL = {}, __CACHE_ATTR = []

const each = function() {
    Array.prototype.forEach.call(...arguments)
}


const setProperty = function(o, s, v) {
    s = s.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
    s = s.replace(/^\./, '');           // strip a leading dot
    let a = s.split('.');
    for (let i = 0, n = a.length; i < n; ++i) {
        let k = a[i];
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

const getImplTagNames = () => {
    let tagNames = util.tags.selectTags().split(',')
    if(!tagNames[0])
        return null
    return tagNames.filter((tagName) => {
        if(!/\[(.*)\]/.test(tagName))
            return true
    })
}

const getImplTags = (tagNames) => {
    return tagNames.map((tagName) => {
        if(!/\[(.*)\]/.test(tagName))
            return util.tags.getTag(document.createElement(tagName))
    })
}


const Attr = function(attr, el, expr, parent){
    let self = this

    let $inst = Object.create(attr.opts)

    parent = parent || self.parent

    each(Object.keys(parent), (key) => {
        if(self.hasOwnProperty(key) || Object.getPrototypeOf(self).hasOwnProperty(key))
            return

        Object.defineProperty(Object.getPrototypeOf(self), key, {
            get: function(){
                return parent[key]
            },
            set: function(value){
                parent[key] = value
            }
        })
    })

    expr = expr || el.getAttribute(attr.name)

    self._attr = $inst

    let _attr = {
        name: attr.name,
        get value(){
            return util.tmpl(expr, self)
        },
        set value(v){
            let m = new RegExp("{([\\w\\. \\[\\]']*)}").exec(expr)
            if(m && m[1]){
                setProperty(self, m[1], v)
            }
        }
    }

    $inst.init.apply(self, [this.root, _attr])

}


let nextId = -1
const parseAttrInTag = (attr, impl) => {
        let selector= '['+attr.name+']'
        let implAttrs = []
        let regAttr = new RegExp(attr.name+REGEX_ATTR, 'g')

        let $parse = document.createElement('div')
        $parse.innerHTML = impl.tmpl;
        let elems = $parse.querySelectorAll(selector)

        each(elems, (el) => {
            nextId++
            let ref = '__'+attr.name+'__id__'+nextId
            let expr = el.getAttribute(attr.name)

            if(attr.opts.compile)
                attr.opts.compile.apply(attr.opts, [el])

            el.removeAttribute(attr.name)

            let tmpl = ''

            if(attr.opts.tmpl)
                tmpl = attr.opts.tmpl
            else
                tmpl = el.innerHTML
                               .replace(new RegExp('each'+REGEX_ATTR, 'g'), '')
                               .replace(new RegExp('if'+REGEX_ATTR, 'g'), '')

            el.setAttribute('data-is', ref)
            let cachefn = impl.fn;
            cacheTag(ref, tmpl, '', '', function(){
                Attr.apply(this, [attr, this.root, expr, this.parent])
            })
        })

        impl.tmpl = $parse.innerHTML

        return impl
}


const parseAttrsInTag = (impl) => {
    let nextId = -1
    let implAttrs = [];

    Object.keys(__ATTR_IMPL).forEach((key) => {
        impl = parseAttrInTag(__ATTR_IMPL[key], impl)
    })

    return impl
}

const cacheTag2 = riot.tag2;
riot.tag2 = function(name, tmpl, css, attrs, fn){
    fn = fn || function(){}
    let impl = parseAttrsInTag({name, tmpl, css, attrs, fn})
    cacheTag2.apply(riot,
        Object.keys(impl).map(key => impl[key]))
    return name;
}

const cacheTag = riot.tag;
riot.tag = function(name, tmpl, css, attrs, fn){
    fn = fn || function(){}
    let impl = parseAttrsInTag({name, tmpl, css, attrs, fn})
    cacheTag.apply(riot,
        Object.keys(impl).map(key => impl[key]))
    return name;
}

const selectAttrs = (attrs, tag) => {

    if(!attrs){
        return selectAttrs(Object.keys(__ATTR_IMPL))
    }

    attrs.unshift(null)

    return attrs
    .reduce((list, a) => {
        let attr = '['+a.trim().toLowerCase()+']'
        if(!list)
            return attr
        return list+','+attr
    })
}

const parseAttr = (attr, el, target) => {

    nextId++
    let ref = '__'+attr.name+'__id__'+nextId

    cacheTag(ref, attr.opts.tmpl || util.dom.getOuterHTML(el), '', '', function(){
        Attr.apply(this, [attr, el, el.getAttribute(attr.name), target])
    })

    return ref
}

riot.mountAttr = function(selector){
    if(selector === "*")
        selector = selectAttrs()
    else
        selector = selectAttrs(selector.split(/, */))

    let elements = document.querySelectorAll(selector)

    each(elements, (el) => {
        Object.keys(__ATTR_IMPL).forEach((name) => {
            if(!el.hasAttribute(name))
                return
            let attr = __ATTR_IMPL[name];

            if(attr.opts.compile)
                attr.opts.compile.apply(attr.opts, [el, el._tag])

            if(el._tag){
                if(attr.opts.tmpl){
                    let dom = document.createElement('span')
                    let ref = parseAttr(attr, el, {})

                    dom.appendChild(el.cloneNode(true))

                    if(attr.opts.target){
                        try {
                            document.querySelector(attr.opts.target).appendChild(dom)
                        } catch (e){}
                    }else{
                        el.appendChild(dom)
                    }

                    util.tags.mountTo(dom, ref, {}, {})
                }else{

                    if(attr.opts.target){
                        try {
                            document.querySelector(attr.opts.target).appendChild(el)
                        } catch (e){}
                    }

                    Attr.apply(el._tag, [__ATTR_IMPL[name], el, null, el._tag])
                    el._tag.update()
                }
            }else{
                let ref = parseAttr(attr, el, {})

                if(attr.opts.target){
                    try {
                        document.querySelector(attr.opts.target).appendChild(el)
                    } catch (e){}
                }

                util.tags.mountTo(el, ref, {}, {})

            }
        })
    })
}

riot.attr = (name, opts) => {
    __ATTR_IMPL[name] = {name, opts}
    let tagNames = getImplTagNames()

    if(!tagNames)
        return

    let impls = getImplTags(tagNames)
    impls.forEach((impl) => {
        parseAttrInTag(__ATTR_IMPL[name], impl)
    })
}

export default riot.attr
