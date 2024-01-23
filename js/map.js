define(['mapboxgl', 'togpx', 'constants'], function (mapboxgl, togpx, constants) {
    let map = null;
    const markers = [];
    let routeGeojson = null;
    let route = null;
    let timeout = null;

    return {
        showIn: function (containerId) {
            mapboxgl.accessToken = constants.mapboxAccessToken;
            map = new mapboxgl.Map({
                container: containerId,
                style: 'mapbox://styles/mapbox/streets-v11',
                center: [10.4474088, 51.1634803],
                zoom: 5
            });
            map.on('load', function () {
                map.setLayoutProperty('country-label', 'text-field', ['get', 'name_de']);
                map.setLayoutProperty('settlement-label', 'text-field', ['get', 'name_de']);
                map.setLayoutProperty('poi-label', 'text-field', ['get', 'name_de']);
            });
        },

        flyTo: function (coords) {
            resetMap();
            map.flyTo({center: coords, zoom: 15});
            markers.push(new mapboxgl.Marker().setLngLat({lng: coords[0], lat: coords[1]}).addTo(map));
        },

        forwardGeocode: function (searchText, onSuccess) {
            const url = constants.mapboxApiBaseUrl + 'geocoding/' + constants.mapboxApiVersion + '/mapbox.places/' +
                searchText +
                '.json?access_token=' + constants.mapboxAccessToken +
                '&country=DE&language=de&types=locality,neighborhood,address,poi';
            $.ajax({
                url, success: function (result) {
                    onSuccess(result.features.map(feature => ({
                        name: feature.place_name,
                        coords: feature.center
                    })));
                }
            });
        },

        reverseGeocode: function (coords, onSuccess) {
            const url = constants.mapboxApiBaseUrl + 'geocoding/' + constants.mapboxApiVersion + '/mapbox.places/' +
                coords.longitude + ',' +
                coords.latitude +
                '.json?access_token=' + constants.mapboxAccessToken +
                '&country=DE&language=de';
            $.ajax({
                url, success: function (result) {
                    const feature = result.features[0];
                    onSuccess({
                        name: feature.place_name,
                        coords: feature.center
                    });
                }
            });
        },

        directions: function (coords, routeType) {
            resetMap();

            coords.forEach(coord => markers.push(new mapboxgl.Marker().setLngLat({
                lng: coord[0],
                lat: coord[1]
            }).addTo(map)));

            let url;

            if (routeType === 'bicycle') {
                url = constants.mapboxApiBaseUrl + 'directions/' + constants.mapboxApiVersion + '/mapbox/cycling/' +
                    coords.join(';') +
                    '.json?geometries=geojson&access_token=' + constants.mapboxAccessToken;
            } else {
                url = constants.mapboxApiBaseUrl + 'directions/' + constants.mapboxApiVersion + '/mapbox/driving-traffic/' +
                    coords.join(';') +
                    '.json?geometries=geojson&exclude=motorway&access_token=' + constants.mapboxAccessToken;
            }
            console.log(url);
            $.ajax({
                url, success: function (result) {
                    routeGeojson = {
                        'type': 'Feature',
                        'properties': {},
                        'geometry': {
                            'type': 'LineString',
                            'coordinates': []
                        }
                    };
                    map.addSource('route', {
                        'type': 'geojson',
                        'data': routeGeojson
                    });

                    map.addLayer({
                        'id': 'route',
                        'type': 'line',
                        'source': 'route',
                        'layout': {
                            'line-join': 'round',
                            'line-cap': 'round'
                        },
                        'paint': {
                            'line-color': 'rgba(50, 50, 50, .33)',
                            'line-width': 8
                        }
                    });

                    route = result.routes[0].geometry.coordinates;
                    const bounds = route.reduce((minmax, coordinates) => {
                        if (coordinates[0] < minmax[0]) {
                            minmax[0] = coordinates[0];
                        }
                        if (coordinates[0] > minmax[2]) {
                            minmax[2] = coordinates[0];
                        }

                        if (coordinates[1] < minmax[1]) {
                            minmax[1] = coordinates[1];
                        }
                        if (coordinates[1] > minmax[3]) {
                            minmax[3] = coordinates[1];
                        }

                        return minmax;
                    }, [Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]);
                    map.fitBounds(bounds, {padding: 50, maxZoom: 15});

                    timeout = 500 / route.length;
                    animateRoute();
                }
            });
        },

        togpx: function (onSuccess, onError) {
            if (routeGeojson) {
                const gpx = togpx(routeGeojson);

                const formData = new FormData();
                formData.set('name', constants.everysightRouteName);
                formData.set('file', new File(gpx.split(''), 'test.gpx'));
                formData.set('time', new Date().toISOString());
                formData.set('originalTZOffsetInMinutes', '-120');

                const data = {
                    'name': constants.everysightRouteName,
                    'file': new File([gpx], 'test'),
                    'time': new Date().toISOString(),
                    'originalTZOffsetInMinutes': '-120'
                };

                $.post({
                    url: constants.everysightBaseUrl + 'create',
                    headers: {
                        'authorization': constants.everysightAuthorization
                    },
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: () => onSuccess(),
                    error: () => onError()
                })
            }
        }
    };

    function animateRoute() {
        routeGeojson.geometry.coordinates.push(route[routeGeojson.geometry.coordinates.length]);
        map.getSource('route').setData(routeGeojson);
        if (routeGeojson.geometry.coordinates.length !== route.length) {
            setTimeout(animateRoute, timeout);
        }
    }

    function resetMap() {
        markers.forEach(marker => marker.remove());

        if (map.getLayer('route')) {
            map.removeLayer('route');
        }

        if (map.getSource('route')) {
            map.removeSource('route');
        }
    }
});
