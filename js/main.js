requirejs.config({
    baseUrl: "js",
    paths: {
        jquery: [
            '//ajax.googleapis.com/ajax/libs/jquery/3.5.1/jquery.min',
            'ext/jquery_3.5.1_jquery'
        ],
        mapboxgl: [
            '//api.mapbox.com/mapbox-gl-js/v1.10.0/mapbox-gl',
            'ext/mapbox-gl'
        ],
        underscore: [
            '//underscorejs.org/underscore-min',
            'ext/underscore-min'
        ],
        togpx: 'ext/togpx',

        shim: {
            togpx: {
                deps: [],
                exports: 'togpx'
            }
        }
    }
});

require(['map', 'form'], function (map, form) {
    map.showIn('map-container');
    form.initialize();
});
