/**
 * Contains framework core
 */

var core = {};

/**
 * core.declare()
 * 
 * This allows to simply declare advanced classes, usage:
 * 
 * class core.declare(Object classDefinition);
 * class core.declare(class superClass [, Object classDefinition]);
 * 
 * Important notes:
 * 
 * - to call inherited implementation from method, use this.inherited() call
 * - mixins allows adding additional functionality into classes. List of mixins is
 *   provided in form of Array containing classes or simple definition objects.
 * - super class and class definition takes precedence over mixins (their methods
 *   and properties will overwrite the imported ones from mixins) 
 * - for all properties there are automatically generated getters, setters and
 *   resetters. For example if you declare property `foo`, the following methods
 *   will be automatically created: setFoo(value), value getFoo(void), value resetFoo(void)
 */

/* //example (basic & inheritance):
 * 
 * var A = core.declare({
 *     construct: function () {
 *          console.log('A::construct');
 *          this.foo();
 *     },
 *   
 *     foo: function () {
 *          console.log('A::foo');
 *     }
 * });
 * 
 * //B inherits from A:
 * 
 * var B = core.declare(A, {
 *     foo: function () {
 *          console.log('B::foo');
 *          this.inherited(); //call inherited method foo
 *     }
 * });
 * 
 * var a = new A();
 * var b = new B();
 * 
 * //example (using mixins):
 * 
 * var mixin1 = core.declare({
 *     bar1: function () {
 *         console.log('mixin1::bar1');
 *     }
 * });
 * 
 * var mixin2 = core.declare({
 *     bar2: function () {
 *         console.log('mixin2::bar2');
 *     }
 * });
 * 
 * //mixin can be also in form of literal object:
 * var mixin3 = {
 *     bar3: function () {
 *          console.log('mixin3::bar3');
 *     }
 * };
 * 
 * var C = core.declare(B, [mixin1, mixin2], {
 *      foo: function () {
 *          console.log('C::foo');
 *          this.bar1();
 *          this.bar2();
 *          this.bar3();
 *      }
 * });
 * 
 * //example (built-in events mechanism):
 * 
 * var myClass = core.declare({
 *     fire: function () {
 *         //do something here and fire the event:
 *         
 *         this.onFire(1, 2, 3);
 *     },
 *     
 *     onFire: function (arg1, arg2, arg3) {
 *         //additional logic can be here, but is not necessary
 *         //if return value of this function is false, all event
 *         //handlers will not be called
 *     }
 * });
 * 
 * var myObject = new myClass();
 * 
 * myObject.onFire.bind(function (sender, arg1, arg2, arg3) {
 *     console.log('onFire event raised!');
 * });
 * 
 * myObject.fire();
 */

(function () {
    /**
     * Does the same as typeof operator, but recognizes arrays, nulls and objects separately
     */
    function typeOf(value)
    {
        var s = typeof value;
        
        if (s === 'object')
        {
            if (value) 
            {
                if (typeof value.length === 'number' && !(value.propertyIsEnumerable('length')) && typeof value.splice === 'function')
                {
                    return 'array';
                }
            }
            else
            {
                return 'null';
            }
        }
        
        return s;
    }
    
    /**
     * Creates a clone of the variable
     */
    function clone (what)
    {
        var isArray = what instanceof Array;
        var isObject = what instanceof Object;
        if (what !== null && (isArray || isObject))
        {
            var cloned;
            
            if (isArray)
            {
                cloned = [];
                var length = what.length;
                
                for (var i = 0; i < length; i++)
                {
                    cloned[i] = arguments.callee(what[i]);
                }
            }
            else
            {
                cloned = {};
                for (var i in what)
                {
                    if (!what.hasOwnProperty(i)) continue;
                    
                    cloned[i] = arguments.callee(what[i]);
                }
            }
                        
            return cloned;
        }
        
        return what;
    }
    
    /**
     * Declares classes
     */
    core.declare = function (SuperClass, definition)
    {
        switch (arguments.length)
        {
        case 2:
            definition = arguments[1];
            SuperClass = arguments[0];
            break;
        case 1:
            definition = arguments[0];
            SuperClass = null;
            break;
        }
        
        /**
         * Creates accessors for given property (by name) within definition
         */
        function createAccessors (definition, name) {
            var nameUpper = name.substr(0, 1).toUpperCase() + name.substr(1);
            
            /**
             * Creates single accessor defined by accessorName, property name and
             * accessor function
             */
            function createAccessor (accessorName, propertyName, accessor) {
                if (!definition[accessorName])
                {
                    definition[accessorName] = accessor;
                }
                else
                {
                    definition[accessorName].inherited = accessor;
                }
            }
            
            createAccessor('set' + nameUpper, name, function (value) {
                this[name] = value;
            });
            
            createAccessor('get' + nameUpper, name, function () {
                return this[name];
            });
            
            createAccessor('reset' + nameUpper, name, function () {
                this[name] = definition[name];
            });
        }
        
        /**
         * Prepares definition to be imported to Class prototype. At first goes through
         * definition and creates all accessors for properties. Secondly, if parent
         * is given, goes through it and compares existing members within parent and
         * definition. If both defines the same members (same by name), overrides
         * existing ones and does inheritance. Finally copies all members from definition
         * that were not defined within parent. 
         * 
         * Returns prepared structure of containing properties and methods.
         */
        function prepareDefinition (definition, parent) {
            var prepared = {
                properties: {},
                methods: {}
            };
            
            /**
             * Phase 1. Create accessors for properties
             */
            for (var name in definition)
            {
                if (!(definition[name] instanceof Function))
                {
                    createAccessors(definition, name);
                }
            }
            
            /**
             * Phase 2. Iterate over parent (if defined) and inherit its members
             */
            for (var name in parent)
            {
                if (name == 'inherited')
                {
                    continue;
                }
                
                //member comes from definition, inherited comes from parent
                (function (member, inherited, name) {
                    
                    //member with this name exists, overriding
                    if (typeof member !== 'undefined')
                    {
                        var memberType = typeOf (member);
                        var inhertedType = typeOf (inherited);
                        
                        //got method here
                        if (member instanceof Function)
                        {
                            //only methods can override methods
                            if (!(inherited instanceof Function))
                            {
                                throw 'Types mismatch: ' + name + ': ' + inhertedType + ' expected, ' + memberType + ' given';
                            }
                            
                            member.inherited = inherited;
                        }
                        //if types of both inherited and member are equal, or inherited is null or undefined, simply
                        //override the property with new one
                        else if (inhertedType === memberType || inhertedType === 'undefined' || inherited === null)
                        {
                            prepared.properties[name] = member;
                        }
                        else
                        {
                            throw 'Types mismatch: ' + name + ': ' + inhertedType + ' expected, ' + memberType + ' given';
                        }
                    }
                    //member is a method and does not exist in parent implementation, so just copy it
                    else if (inherited instanceof Function)
                    {
                        prepared.methods[name] = inherited;
                    }
                    //member is a property and does not exist in parent implementation, so just copy it
                    else
                    {
                        prepared.properties[name] = inherited;
                    }
                })(definition[name] ? definition[name] : undefined, parent[name], name);
            }
            
            /**
             * Phase 3. Fill prepared structure with members that does not already exist
             */
            for (var name in definition)
            {
                if (definition[name] instanceof Function)
                {
                    if (typeof prepared.methods[name] === 'undefined')
                    {
                        prepared.methods[name] = definition[name];
                    }
                }
                else if (typeof prepared.properties[name] === 'undefined')
                {
                    prepared.properties[name] = definition[name];
                }
            }
            
            return prepared;
        }
        
        /**
         * Creates event method (name matches on*) in given scope.
         */
        function createEvent (scope, name) {
            var original = scope[name];
            
            //override original on* method with virtual one that will call its original implementation and all listeners
            scope[name] = function () {
                var ret = original.apply(scope, arguments);
                var listeners = arguments.callee.listeners;
                
                if (ret !== false && listeners && listeners.length > 0)
                {
                    var args = [scope];
                    
                    for (var i = 0; i < arguments.length; i++)
                    {
                        args.push(arguments[i]);
                    }
                    
                    for (i = 0; i < listeners.length; i++)
                    {
                        if (listeners[i] instanceof Function)
                        {
                            listeners[i].apply(scope, args);
                        }
                    }
                }
                
                return ret;
            };
            
            //Create bind function within on* method to allow binding listeners
            scope[name].bind = function (listener) {
                if (!arguments.callee.bindsTo.listeners)
                {
                    arguments.callee.bindsTo.listeners = [listener];
                }
                else
                {
                    arguments.callee.bindsTo.listeners.push(listener);
                }
            };
            
            //Create unbind function within on* method to allow unbinding listeners
            scope[name].unbind = function (listener) {
                var listeners = arguments.callee.bindsTo.listeners;
                
                if (listeners)
                {
                    for (var i in listeners)
                    {
                        if (listeners[i] === listener)
                        {
                            delete listeners[i];
                            break;
                        }
                    }
                }
            };
            
            scope[name].original = original;
            scope[name].bind.bindsTo = scope[name];
            scope[name].unbind.bindsTo = scope[name];
        }
        
        /**
         * This will be our new class
         */
        var Class = function () {
    
            for (var name in this)
            {
                //While constructing class, find all on* methods and create event on them
                if (this[name] instanceof Function)
                {
                    if (name.substr(0, 2) == 'on')
                    {
                        createEvent(this, name);
                    }
                }
                //Otherwise create a clone of the property (if not cloned, multiple instances of the same class will
                //share the same property if the property is object, what is really wrong and dangerous)
                else
                {
                    this[name] = clone(this[name]);
                }
            }
            
            //Call the constructor if enabled
            if (this.construct && !this.construct.disabled)
            {
                this.construct.apply(this, arguments);
            }
            
        };
        
        if (SuperClass)
        {
            //If super constructor exists, temporarily disable it
            if (SuperClass.prototype.construct)
            {
                SuperClass.prototype.construct.disabled = true;
            }
            
            //Create class prototype
            Class.prototype = new SuperClass();
            
            //Enable previously disabled constructor
            if (SuperClass.prototype.construct)
            {
                delete SuperClass.prototype.construct.disabled;
            }
        }
        
        //Prepare definition to be imported into prototype
        var prepared = prepareDefinition(definition, SuperClass ? SuperClass.prototype : {
            
            //Default configure() method
            configure: function (options) {
                for (var name in options)
                {
                    if (!options.hasOwnProperty(name)) continue;
                    
                    var setter = 'set' + name.substr(0, 1).toUpperCase() + name.substr(1);
                    
                    if (this[setter] && this[setter] instanceof Function)
                    {
                        this[setter](options[name]);
                    }
                    else
                    {
                        this[name] = options[name];
                    }
                }
            },
            
            //Default destroy() method
            destroy: function () {
                for (var name in this)
                {
                    delete this[name];
                }
                
                for (name in this.__proto__)
                {
                    delete this.__proto__[name];
                }
            }
        });
        
        if (prepared.methods.inherited || prepared.properties.inherited)
        {
            throw '`inherited` is a reserved member name and could not be defined by user';
        }
        
        //Import properties
        for (var name in prepared.properties)
        {
            Class.prototype[name] = prepared.properties[name];
        }
        
        //Import methods
        for (name in prepared.methods)
        {
            Class.prototype[name] = prepared.methods[name];
        }
        
        //Create special inherited() method
        Class.prototype.inherited = function () {
            if (!arguments.callee.caller.inherited)
            {
                throw 'Method has no inherited implementation';
            }
            
            return arguments.callee.caller.inherited.apply(this, arguments);
        };
        
        //Return finished class
        return Class;
    };
})();