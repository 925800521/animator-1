/**
 # Copyright (c) 2012 Borys Forytarz <borys.forytarz@gmail.com>
 #
 # Permission is hereby granted, free of charge, to any person
 # obtaining a copy of this software and associated documentation files
 # (the "Software"), to deal in the Software without restriction,
 # including without limitation the rights to use, copy, modify,
 # merge, publish, distribute, sublicense, and/or sell copies of the
 # Software, and to permit persons to whom the Software is furnished
 # to do so, subject to the following conditions:
 #
 # The above copyright notice and this permission notice shall be
 # included in all copies or substantial portions of the Software.
 #
 # THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 # EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 # MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
 # NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
 # BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 # ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 # CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 # SOFTWARE.
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

                            member.inherited = inherited.original || inherited;
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
                        prepared.methods[name] = inherited.original || inherited;
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
        function createEvent (originalEvent, name)
        {
            //Overwrite original event method with a new one which will call its original implementation and all event listeners
            var newEvent = function () {
                var ret = originalEvent.apply(this, arguments);
                var listeners = this.construct.listeners;

                if (ret !== false && listeners && listeners[name] && listeners[name].length > 0)
                {
                    var args = [this];
                    var length = arguments.length;

                    for (var i = 0; i < length; i++)
                    {
                        args.push(arguments[i]);
                    }

                    length = listeners[name].length;

                    for (i = 0; i < length; i++)
                    {
                        if (listeners[name][i] instanceof Function)
                        {
                            listeners[name][i].apply(this, args);
                        }
                    }
                }

                return ret;
            };

            //Create bind() method within new event method which will allow to bind listeners to event
            newEvent.bind = function (handler) {
                var name = arguments.callee.eventName;
                var scope = arguments.callee.eventScope;

                if (!scope.construct.listeners) scope.construct.listeners = {};
                if (!scope.construct.listeners[name]) scope.construct.listeners[name] = [];

                scope.construct.listeners[name].push(handler);
            };

            //Create unbind() method within new event method which will allow to unbind listeners from event
            newEvent.unbind = function (handler) {
                var name = arguments.callee.eventName;
                var scope = arguments.callee.eventScope;

                if (scope.construct.listeners && scope.construct.listeners[name])
                {
                    var listeners = scope.construct.listeners[name];
                    var length = listeners.length;

                    for (var i = 0; i < length; i++)
                    {
                        if (listeners[i] === handler)
                        {
                            delete listeners[i];
                            break;
                        }
                    }
                }
            };

            //Create reference to original method (will be required in inheritance)
            newEvent.original = originalEvent;

            return newEvent;
        }

        /**
         * This will be our new class
         */
        var Class = function () {
            var constructArgs = arguments;

            //Find all on* methods and add pointers for proper scope and name to bind & unbind methods
            for (var name in this)
            {
                if (this[name] instanceof Function && name.substr(0, 2) == 'on')
                {
                    this[name].bind.eventScope = this;
                    this[name].bind.eventName = name;
                    this[name].unbind.eventScope = this;
                    this[name].unbind.eventName = name;
                }
            }

            //Because construct() method will be used to contain listeners for events, we have to create
            //new construct() method to be its separate instance within all class instances.
            (function (originalConstruct, scope) {
                scope.construct = function () {
                    return originalConstruct.apply(scope, arguments);
                };

                if (!originalConstruct.disabled)
                {
                    originalConstruct.apply(scope, constructArgs);
                }
            })(this.construct, this);
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
            //Default construct() method
            construct: function () {},

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
            Class.prototype[name] = clone(prepared.properties[name]);
        }

        //Import methods
        for (name in prepared.methods)
        {
            if (name.substr(0, 2) == 'on')
            {
                Class.prototype[name] = createEvent(prepared.methods[name], name);
            }
            else
            {
                Class.prototype[name] = prepared.methods[name];
            }
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