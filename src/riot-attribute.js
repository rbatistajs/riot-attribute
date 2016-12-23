const util = riot.util
const REGEX_ATTR = '=?(?:"([^"]*)"|\'([^\']*)\'|({[^}]*}))?'

let __ATTR_IMPL = {}, __CACHE_ATTR = []

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

const compileAttr = (attr, impl) => {

    let nextId = -1
    let implAttrs = []
    let regAttr = new RegExp(attr.name+REGEX_ATTR, 'g')

    impl.tmpl = impl.tmpl.replace(regAttr, function(){
        nextId++
        let ref = '__'+attr.name+'__id__'+nextId

        implAttrs.push({
            name: attr.name,
            constructor: attr.constructor,
            ref: ref,
            expr: arguments[1] || arguments[2] || arguments[3] || ""
        })
        return ref
    })


    let cachefn = impl.fn

    impl.fn = function(opts){

        if(!implAttrs.length){
            return cachefn.apply(this, arguments)
        }

        this.on('mount', function () {
            console.log(implAttrs)
            implAttrs.forEach((attr) =>{
                let el = document.querySelector('['+attr.ref+']')
                el.removeAttribute(attr.ref)
                new Attr(attr, el, this)
            })
        })

        return cachefn.apply(this, arguments)
    }
    
    return impl;
}


const compileAttrs = (impl) => {
    let nextId = -1
    let implAttrs = [];

    Object.keys(__ATTR_IMPL).forEach((key) => {
        impl = compileAttr(__ATTR_IMPL[key], impl)
    })

    return impl
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

class Attr {
    constructor(attr, el, tag){
        riot.observable(this)
        this.value = util.tmpl(attr.expr, tag || {})
        this.element = el

        if(tag)
            this.tag = tag

        this._attr = attr
        this.root = el

        if(util.check.isFunction(this.value))
            el.setAttribute(attr.name, '')
        else
            el.setAttribute(attr.name, this.value)

        attr.constructor.apply(this,[el,this.value])

        __CACHE_ATTR.push(this)

        if(!tag)
            return

        tag.on('update', () => {
            this.trigger('update', this.value)
        })

        tag.on('unmount', () => {
            this.trigger('unmount', this.value)
        })
    }

}

riot.mountAttr = function(selector){
    if(selector === "*")
        selector = selectAttrs()
    else
        selector = selectAttrs(selector.split(/, */))

    let elements = document.querySelectorAll(selector)

    Array.prototype.forEach.call(elements, (el) => {

        if(__CACHE_ATTR.filter(a=> a.root === el).length)
            return

        Object.keys(__ATTR_IMPL).forEach((name) => {
            if(!el.hasAttribute(name))
                return

            let attr = __ATTR_IMPL[name]

            new Attr({
                name: name,
                constructor: attr.constructor,
                expr: el.getAttribute(name)
            }, el, el._tag)
        })

    })
}

const cacheTag2 = riot.tag2;
riot.tag2 = function(name, tmpl, css, attrs, fn){
    fn = fn || function(){}
    let impl = compileAttrs({name, tmpl, css, attrs, fn})
    cacheTag2.apply(riot,
        Object.keys(impl).map(key => impl[key]))
    return name;
}

const cacheTag = riot.tag;
riot.tag = function(name, tmpl, css, attrs, fn){
    fn = fn || function(){}
    let impl = compileAttrs({name, tmpl, css, attrs, fn})
    cacheTag.apply(riot,
        Object.keys(impl).map(key => impl[key]))
    return name;
}

riot.attr = (name, constructor) => {
    __ATTR_IMPL[name] = {name, constructor}
    let tagNames = getImplTagNames()
    if(!tagNames)
        return

    let impls = getImplTags(tagNames)
    impls.forEach((impl) => compileAttr(__ATTR_IMPL[name], impl))
}

export default riot.attr
