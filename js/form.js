define(['jquery', 'map', 'constants', 'underscore', 'text!/templates/form-template.html'],
    function ($, map, constants, _, formTemplate) {
        return {
            initialize: function () {
                const waypoints = [
                    {label: 'Start', value: '', coords: null},
                    {label: 'Ziel', value: '', coords: null}
                ];

                const compiledTemplate = _.template(formTemplate);
                let indicating = null;

                $(document).ready(function ($) {
                    initializeControls();
                });

                function initializeControls() {
                    $('#form-container').html(compiledTemplate({waypoints}));

                    const waypointDiv = $('.waypoint');

                    let routeFormStyle = window.getComputedStyle($('#route-form')[0]);
                    let routeFormHeight = parseInt(routeFormStyle['height']);
                    let routeFormTop = parseInt(routeFormStyle['top']);

                    let waypointAdd = $('#waypoint-add');
                    let waypointAddStyle = window.getComputedStyle(waypointAdd[0]);
                    let waypointAddHeight = parseInt(waypointAddStyle['height']);
                    let waypointAddTop = routeFormHeight + 2 * routeFormTop;
                    waypointAdd.css('top', waypointAddTop);

                    let exportButton = $('#export');
                    exportButton.css('top', waypointAddTop);

                    let routeType = $('#route-type');
                    routeType.css('top', waypointAddTop + waypointAddHeight + routeFormTop);

                    waypointDiv.filter(function () {
                        return $(this).find('input').val() !== '';
                    }).each(function () {
                        $(this).find('label').addClass('small');
                    });

                    waypointDiv.on('keydown', function () {
                        if ($(this).find('input').val() === '') {
                            $(this).find('label').addClass('keydown');
                        }
                    });

                    waypointDiv.on('keyup', function () {
                        const $input = $(this).find('input');
                        const value = $input.val();
                        const index = parseInt($input.attr('id').replace('waypoint', ''));
                        waypoints[index].value = value;
                        if (waypoints[index].coords !== null) {
                            waypoints[index].coords = null;
                            route();
                        }
                        const $label = $(this).find('label');

                        if (value === '') {
                            $label.removeClass('small');
                        } else {
                            $label.addClass('small');
                        }

                        if (value.length > 3) {
                            const $autocomplete = $(this).find('.autocomplete');
                            const $ul = $autocomplete.find('ul');
                            map.forwardGeocode(value, function (places) {
                                $ul.empty();
                                places.forEach(place => $ul.append($('<li></li>').append(place.name).on('click', function () {
                                    $input.val(place.name);
                                    waypoints[index].value = place.name;
                                    waypoints[index].coords = place.coords;
                                    $autocomplete.removeClass('visible');
                                    route();
                                })));
                                $autocomplete.addClass('visible');
                            });
                        }

                        $label.removeClass('keydown');
                    });

                    handleWaypointAddClick();

                    if (navigator.geolocation) {
                        const $button = waypointDiv.find('.geolocation');
                        $button.removeClass('unavailable');
                        $button.on('click', function () {
                            const $parent = $(this).parent();
                            const $input = $parent.find('input');
                            const index = parseInt($input.attr('id').replace('waypoint', ''));
                            const $label = $parent.find('label');
                            navigator.geolocation.getCurrentPosition(function (position) {
                                map.reverseGeocode(position.coords, function (place) {
                                    $input.val(place.name);
                                    waypoints[index].value = place.name;
                                    waypoints[index].coords = place.coords;
                                    $label.addClass('small');
                                    route();
                                });
                            }, function () {
                                $button.addClass('unavailable');
                            });
                        });
                    }

                    $('input[name="route-types"]').on('click', function () {
                        route();
                    });

                    exportButton.on('click', function () {
                        map.togpx(() => {
                            indicate($(this).find('div'), 'ok');
                        },
                        () => {
                            indicate($(this).find('div'), 'error');
                        });
                    });
                }

                function route() {
                    const route = waypoints.filter(waypoint => waypoint.coords !== null);
                    if (route.length === 1) {
                        map.flyTo(route[0].coords);
                    } else if (route.length > 1) {
                        map.directions(
                            route.map(waypoint => waypoint.coords),
                            $('input[name="route-types"]:checked').val()
                        );
                    }
                }

                function handleWaypointAddClick() {
                    $('#waypoint-add').on('click', function () {
                        waypoints[waypoints.length - 1].label = 'Wegpunkt';
                        waypoints.push({label: 'Ziel', value: '', coords: null});
                        $('#form-container').html(compiledTemplate({waypoints}));
                        initializeControls();
                    });
                }

                function indicate($div, status) {
                    if (indicating === null) {
                        indicating = status;
                        $div.html('<i class="fa fa-' + (status === 'ok' ? 'check' : 'times') + '"></i>');
                        setTimeout(() => indicate($div, null), 1000);
                    } else {
                        $div.html('<i class="fa fa-upload"></i>');
                        indicating = null;
                    }
                }
            }
        }
    });