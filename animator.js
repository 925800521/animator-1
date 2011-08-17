/**
 * Animator class that allows simply animating DOM elements
 */

var Animator = core.declare({
    /**
     * Definition of configuration properties for keyframes
     */
    KEYFRAME_CONFIG_PROPERTIES: ['duration', 'timing'],
    
    /**
     * Definition of css properties that can be animated
     */
    KEYFRAME_ANIMATION_PROPERTIES: [
        'width', 'height', 'left', 'top', 'color', 'backgroundColor',
        'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
        'marginLeft', 'marginRight', 'marginTop', 'marginBottom',
        'borderColor', 'borderLeftColor', 'borderRightColor', 'borderTopColor', 'borderBottomColor',
        'borderWidth', 'borderLeftWidth', 'borderRightWidth', 'borderTopWidth', 'borderBottomWidth'
    ],
    
    /**
     * Configuration option - the DOM element to be animated
     */
    element: null,
    
    /**
     * Configuration option - the number of animation loops
     */
    loops: 0,
    
    /**
     * Configuration option - array containing keyframes that describes animation
     */
    keyframes: [],
    
    /**
     * Configuration option - the default timing function to be used to control keyframes animation 
     */
    timing: 'linear',
    
    /**
     * Configuration option - the default duration of keyframes animation
     */
    duration: 500,
    
    /**
     * Animator constructor. Constructs object and configures properties
     */
    construct: function (options) {
        this.configure(options);
    },
    
    /**
     * Starts animation
     */
    animate: function () {
        if (!this.element) throw 'No element specified';
        if (!this.keyframes || !this.keyframes.length) throw 'No keyframes specified';
        
        if (this.loops > 0)
        {
            var l = this.keyframes.length;
            var extraFrame = {};
            
            for (var i = 0; i < l; i++)
            {
                for (var name in this.keyframes[i])
                {
                    if (!this.keyframes[i].hasOwnProperty(name) || extraFrame[name]) continue;
                    
                    var styles = this.getStyle(name);
                    
                    for (var styleName in styles)
                    {
                        if (!styles.hasOwnProperty(styleName)) continue;
                        
                        var v = styles[styleName];
                        var n = parseInt(v, 10);
                        
                        extraFrame[styleName] = isNaN(n) ? v : n;
                    }
                }
            }
            
            extraFrame.duration = this.duration || this.keyframes[0].duration;
            extraFrame.timing = this.timing || this.keyframes[0].timing;
            
            this.keyframes.push(extraFrame);
        }
        
        this.onAnimationBegin();
        this.animateKeyframe(0);
    },
    
    /**
     * Internal use only. Requests browser for animation frame and calls callback within
     * that frame. Browsers that does not support animation frame will use 60 fps by default.
     */
    requestAnimationFrame: function(callback, element) {
        return (
            window.requestAnimationFrame       || 
            window.webkitRequestAnimationFrame || 
            window.mozRequestAnimationFrame    || 
            window.oRequestAnimationFrame      || 
            window.msRequestAnimationFrame     || 
            function (callback, element) {
                window.setTimeout(callback, 1000 / 60);
            }
        )(callback, element);
    },
    
    /**
     * Internal use only. Animates given keyframe
     */
    animateKeyframe: function (frameIndex) {
        var frame = this.keyframes[frameIndex];
        if (!frame) return;
        
        var deltas = {};
        
        for (var name in frame)
        {
            if (!frame.hasOwnProperty(name) || this.KEYFRAME_CONFIG_PROPERTIES.indexOf(name) >= 0) continue;
            
            if (this.KEYFRAME_ANIMATION_PROPERTIES.indexOf(name) == -1) throw 'Property ' + name + ' could not be animated. Animateable properties: ' + this.KEYFRAME_ANIMATION_PROPERTIES.join(', ');
            
            if (name == 'width' || name == 'height')
            {
                var size = (name == 'width' ? this.getInnerWidth() : this.getInnerHeight());
                deltas[name] = {delta: frame[name] - size, initial: size};
            }
            else if (!name.match(/color$/i))
            {
                var style = this.getStyle(name);
                
                for (var styleName in style)
                {
                    if (!style.hasOwnProperty(styleName)) continue;
                    
                    deltas[styleName] = {delta: frame[name] - parseInt(style[styleName], 10), initial: parseInt(style[styleName], 10)};
                }
            }
            else
            {
                var style = this.getStyle(name);
                
                for (var styleName in style)
                {
                    if (!style.hasOwnProperty(styleName)) continue;
                    
                    var rgbSource = this.getRGB(style[styleName]);
                    var rgbTarget = this.getRGB(frame[name]);
                    
                    if (rgbSource && rgbTarget)
                    {
                        deltas[styleName] = {
                            r: {delta: rgbTarget[0] - rgbSource[0], initial: rgbSource[0]},
                            g: {delta: rgbTarget[1] - rgbSource[1], initial: rgbSource[1]},
                            b: {delta: rgbTarget[2] - rgbSource[2], initial: rgbSource[2]}
                        };
                    }
                }
            }
        }
        
        this.onKeyframeBegin(frameIndex, this.keyframes[frameIndex]);
        
        var startTime = (new Date()).getTime();
        var now;
        var lastProgress;
        var self = this;
        var duration = frame.duration || this.duration;
        
        this.requestAnimationFrame(function () {

            var now = (new Date()).getTime();
            var progress = (1 - (((startTime + duration) - now) / duration));
            if (progress > 1) progress = 1;
            if (progress == lastProgress) return; 
            
            lastProgress = progress;
            
            for (var name in deltas)
            {
                if (!deltas.hasOwnProperty(name)) continue;
                
                if (name.match(/color$/i))
                {
                    var targetR = deltas[name].r.initial + deltas[name].r.delta;
                    var targetG = deltas[name].g.initial + deltas[name].g.delta;
                    var targetB = deltas[name].b.initial + deltas[name].b.delta;
                    
                    var r = self.timingFunction(frame.timing, progress, deltas[name].r.initial, deltas[name].r.delta);
                    var g = self.timingFunction(frame.timing, progress, deltas[name].g.initial, deltas[name].g.delta);
                    var b = self.timingFunction(frame.timing, progress, deltas[name].b.initial, deltas[name].b.delta);
                    
                    self.element.style[name] = 'rgb(' + Math.round(r) + ', ' + Math.round(g) + ', ' + Math.round(b) + ')';
                }
                else
                {
                    var target = deltas[name].initial + deltas[name].delta;
                    self.element.style[name] = Math.round(self.timingFunction(frame.timing, progress, deltas[name].initial, deltas[name].delta)) + 'px';
                }
            }
            
            if (progress < 1)
            {
                self.requestAnimationFrame(arguments.callee);
            }
            else
            {
                self.onKeyframeEnd(frameIndex, self.keyframes[frameIndex]);
                
                if (frameIndex < self.keyframes.length - 1)
                {
                    self.animateKeyframe(frameIndex + 1);
                }
                else if (--self.loops > 0)
                {
                    self.animateKeyframe(0);
                }
                else
                {
                    self.resetLoops();
                    self.onAnimationEnd();
                }
            }
        });
    },
    
    /**
     * Internal use only. Calculates new value basing on given timing function type, progress, initial value and delta.
     */
    timingFunction: function (timing, progress, initial, delta) {
        timing = timing || this.timing;
        
        var r = ({
            'linear': function () {
                return initial + delta * progress;
            },
            'ease-out': function () {
                if (delta > 0)
                {
                    return initial + delta - Math.pow(delta, Math.cos(progress * Math.PI / 2));
                }
                else
                {
                    return initial + delta + Math.pow(-delta, Math.cos(progress * Math.PI / 2));
                }
            },
            'ease-in': function () {
                if (delta > 0)
                {
                    return initial + Math.pow(delta, Math.sin(progress * Math.PI / 2));
                }
                else
                {
                    return initial - Math.pow(-delta, Math.sin(progress * Math.PI / 2));
                }
            }
        })[timing]();
        
        return r;
    },
    
    /**
     * Internal use only. Converts css color to RGB format. Accepts the following color notation:
     * rgb(r, g, b), #ffffff, #fff.
     */
    getRGB: function (style) {
        var m;
        
        if (style[0] == '#')
        {
            style = style.substr(1);
            
            if (style.length == 3)
            {
                var temp = style.match(/^([a-f0-9])([a-f0-9])([a-f0-9])$/i);
              
                if (temp)
                {
                    style = '';
                    
                    for (var i = 1; i < 4; i++)
                    {
                        style += temp[i] + temp[i];
                    }
                }
            }
            
            m = style.match(/^([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})$/i);
            
            if (m)
            {
                return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
            }
        }
        else if (m = style.match(/rgb\s*\(([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*\)/))
        {
            return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
        }
        
        return [255, 255, 255];
    },
    
    /**
     * Internal use only. Returns css property value of given property.
     */
    getStyle: function (style) {
        var multiProperties = {
            borderWidth:    ['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'],
            borderColor:    ['borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']
        };
        
        var el = this.element;
        var camel = this.camelcaseString(style);
        var ret = {};
        
        if (multiProperties[camel])
        {
            var l = multiProperties[camel].length;
            
            for (var i = 0; i < l; i++)
            {
                var name = multiProperties[camel][i];
                
                ret[name] = this.getStyle(name)[name];
            }
            
            return ret;
        }
        
        var hyphen = this.hyphenateString(style);
        
        if (el.style[camel])
        {
            ret[camel] = el.style[camel];
        }
        else if (el.currentStyle)
        {
            ret[camel] = el.currentStyle[hyphen];
        }
        else if (window.getComputedStyle)
        {
            ret[camel] = document.defaultView.getComputedStyle(el, null).getPropertyValue(hyphen);
        }
        
        return ret;
    },
    
    /**
     * Internal use only. Calculates inner element width.
     */
    getInnerWidth: function () {
        return this.element.offsetWidth 
                - parseInt(this.getStyle('padding-left')['paddingLeft'], 10) 
                - parseInt(this.getStyle('padding-right')['paddingRight'], 10)
                - parseInt(this.getStyle('border-left-width')['borderLeftWidth'], 10)
                - parseInt(this.getStyle('border-right-width')['borderRightWidth'], 10);
    },
    
    /**
     * Internal use only. Calculates inner element height.
     */
    getInnerHeight: function () {
        return this.element.offsetHeight 
                - parseInt(this.getStyle('padding-top')['paddingTop'], 10) 
                - parseInt(this.getStyle('padding-bottom')['paddingBottom'], 10)
                - parseInt(this.getStyle('border-top-width')['borderTopWidth'], 10)
                - parseInt(this.getStyle('border-bottom-width')['borderBottomWidth'], 10);
    },
    
    /**
     * Internal use only. Converts hyphenated string to camel-cased string.
     */
    camelcaseString: function (str) {
        return str.replace(/(-[a-z])/g, function (m) {
            return m.substr(1, 1).toUpperCase();
        });
    },
    
    /**
     * Internal use only. Converts camel-cased string to hyphenated string.
     */
    hyphenateString: function (str) {
        return str.replace(/([a-z][A-Z])/g, function (m) {
            return m.substr(0, 1) + '-' + m.substr(1, 1).toLowerCase();
        });
    },
    
    /**
     * Event is fired when animation begins
     */
    onAnimationBegin: function () {},
    
    /**
     * Event is fired when animation ends
     */
    onAnimationEnd: function () {},
    
    /**
     * Event is fired when keyframe begins being animated
     */
    onKeyframeBegin: function (frameIndex, frame) {},
    
    /**
     * Event is fired when keyframe has finished being animated
     */
    onKeyframeEnd: function (frameIndex, frame) {}
});