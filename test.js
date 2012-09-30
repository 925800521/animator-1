window.onload = function () {
    /*var a1 = new Animator({
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
    });*/
	
	var a1 = new Animator({
		element: document.getElementById('test'),
		duration: 1000,
		loops: 1,
		timing: 'ease-in',
		keyframes: [{
			duration: 3000,
			left: 100,
			top: 200,
			backgroundColor: 'rgba(255, 0, 0, 0)'
		}, {
			left: 200,
			top: 0,
            width: 250,
            duration: 2000,
            backgroundColor: 'rgba(255, 255, 0, 0.5)'
		}, {
			left: 300,
			top: 200,
            height: 400,
            backgroundColor: 'rgba(255, 255, 0, 1)'
		}, {
			left: 400,
			top: 0,
            borderColor: '#00f'
		}]
	});

    a1.animate();
};