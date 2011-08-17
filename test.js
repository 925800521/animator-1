window.onload = function () {
    var a1 = new Animator({
        element: document.getElementById('test'),
        loops: 1,
        timing: 'ease-in', //default timing, will be used as timing for additional keyframe creating loop
        duration: 2000, //default duration, will be used as timing for additional keyframe creating loop
        keyframes: [{
            duration: 1000, //overrides default duration
            
            width: 200,
            height: 300,
            backgroundColor: '#f0f',
            marginLeft: 300,
            marginTop: 200,
            borderWidth: 30
        }, {
            duration: 1000, //overrides default duration
            timing: 'ease-out', //overrides default timing
            
            width: 500,
            height: 200,
            marginLeft: 100,
            marginTop: 100,
            borderColor: '#00f'
        }, {
            duration: 500, //overrides default duration
            timing: 'ease-out', //overrides default timing
            
            marginLeft: 400,
            marginTop: 333,
            height: 10,
            width: 100,
            backgroundColor: '#fbb',
            borderWidth: 0
        }]
    });
    
    a1.animate();
};