const cacheMount = riot.mount,
    util = riot.util

const REGEX_ATTR = '=?(?:"([^"]*)"|\'([^\']*)\'|({[^}]*}))?'

let ready, __ATTR_IMPL = {}, __CACHE_ATTR = []

const getImplTagNames = () => {
    let tagNames = util.tags.selectTags().split(',')
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

const compileAttrs = function() {
    let tagNames = getImplTagNames()
    let impls = getImplTags(tagNames)

    impls.forEach((impl) => {
        let nextId = -1
        let implAttrs = [];

        Object.keys(__ATTR_IMPL).forEach((key) => {
            let attr = __ATTR_IMPL[key]
            let regAttr = new RegExp(attr.name+REGEX_ATTR, 'g')

            impl.tmpl = impl.tmpl.replace(regAttr, function(){
                nextId++
                let ref = '__attr__id__'+nextId;

                implAttrs.push({
                    name: attr.name,
                    constructor: attr.constructor,
                    ref: ref,
                    expr: arguments[1] || arguments[2] || arguments[3] || ""
                })
                return 'ref="'+ref+'"';
            })

        })

        let cachefn = impl.fn

        impl.fn = function(opts){

            if(!implAttrs.length){
                return cachefn.apply(this, arguments)
            }

            this.on('mount', function () {
                implAttrs.forEach((attr) =>
                 new Attr(attr, this.refs[attr.ref], this))
            })

            return cachefn.apply(this, arguments)
        }

    })

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


const Attr = function(attr, el, tag){
    let $inst = {},
        value = util.tmpl(attr.expr, tag || {})

    if(tag)
        $inst.tag = tag

    $inst._attr = attr
    $inst.root = el

    if(util.check.isFunction(value))
        el.setAttribute(attr.name, '')
    else
        el.setAttribute(attr.name, value)

    attr.constructor.apply(
        riot.observable($inst),
        [el,value]
    )

    __CACHE_ATTR.push($inst)

    if(!tag)
        return

    tag.on('update', function () {
        let value = util.tmpl(attr.expr, tag)
        $inst.trigger('update', value)
    })

    tag.on('unmount', function () {
        let value = util.tmpl(attr.expr, tag)
        $inst.trigger('unmount', value)
    })
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

riot.mount = function() {
    if(!ready){
        ready = true
        compileAttrs.apply(null,arguments)
    }

    var tags = cacheMount.apply(riot, arguments);

    return tags;
}


riot.attr = (name, constructor) => {
    __ATTR_IMPL[name] = {name, constructor}
}

export default riot.attr
