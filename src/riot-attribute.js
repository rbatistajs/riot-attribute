const REGEX_ATTR = '=?(?:"([^"]*)"|\'([^\']*)\'|({[^}]*}))?'

const chacheMount = riot.mount
const util = riot.util

let ready, __ATTR_IMPL = []

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

const mountAttrs = function() {
    let tagNames = getImplTagNames()
    let impls = getImplTags(tagNames)

    impls.forEach((impl) => {
        let nextId = -1
        let attrExprs = [];

        __ATTR_IMPL.forEach((attr) => {
             let reg = new RegExp(attr.name+REGEX_ATTR, 'g')

             impl.tmpl = impl.tmpl.replace(reg, function(){
                 nextId++
                 attrExprs.push({
                     name: attr.name,
                     opts: attr.opts,
                     expr: arguments[1] || arguments[2] || arguments[3] || ""
                 })
                 return `ref="__attr__id__${nextId}"`
             })

        })

        let cachefn = impl.fn

        impl.fn = function(opts){

            if(!attrExprs.length){
                return cachefn.apply(this, arguments)
            }

            const callAttrEvent = (eventName, callback) => {

                for(let i = 0; i <= nextId; i++){

                    let attr = attrExprs[i]
                    let $event = attr.opts[eventName]
                    let element = this.refs['__attr__id__'+i]
                    let value = util.tmpl(attr.expr, this)

                    if(!util.check.isFunction($event))
                        continue

                    $event.apply(attr.opts, [ element, value, this ])

                    if(callback)
                        callback(attr, element, value)
                }

            };

            this.on('mount', function () {
                callAttrEvent('init', function(attr, element, value){
                    if(!element.hasAttribute(attr.name)){
                        if(util.check.isFunction(value)){
                            element.setAttribute(attr.name, '')
                        }else{
                            element.setAttribute(attr.name, value)
                        }
                    }
                })
            })

            this.on('update', function () {
                callAttrEvent('update')
            })

            this.on('unmount', function () {
                callAttrEvent('remove')
            })

            return cachefn.apply(this, arguments)
        }

    })

    __ATTR_IMPL.forEach((attr) => {
        let elements = document.querySelectorAll(`[${attr.name}]`)

        util.misc.each(elements, (dom) => {
            let $event = attr.opts.init

            if(util.check.isFunction($event))
                $event.apply(attr.opts, [dom, dom.getAttribute(attr.name)])
        })
    })
}

riot.mount = function() {
    if(!ready){
        ready = true
        mountAttrs.apply(null,arguments)
    }

    return chacheMount.apply(riot, arguments);
}

riot.mountAttr = function () {
    
}

riot.attr = (name, opts) => {
    __ATTR_IMPL.push({name, opts})
}

export default riot.attribute
