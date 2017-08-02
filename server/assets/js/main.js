"use strict";

if(!Number.prototype.Between) {
    Number.prototype.Between = function(range) {
        return this >= range[0] && this <= range[1];
    }
}

var c = {
		isActive: false,
		log: function(t) {
			if(!this.isActive) return;

			console.log.apply(this, arguments);
		},
		info: function(t) {
			if(!this.isActive) return;

			console.info.apply(this, arguments);
		},
		error: function(t) {
			if(!this.isActive) return;

			console.error.apply(this, arguments);
		}
	};

var App = window.App || {
		isReady: false,
		Conf: {
			isTouch: !!('ontouchstart' in window),
			isHistoryEnabled: !! (window.history && history.replaceState),
			clickEvent: 'click',
            layouts: {
                'm': [0, 767],
                't': [768, 1139],
                'd': [1140, 99999]
            }
		},
		Init: function() {

			c.log('App.Init');

			this.DocReady.init();
			this.WindowLoad.init();

			this.DocReady.add('App.Init', function() {

				App.Conf.body = $('body');
				App.Conf.body.addClass((App.Conf.isTouch ? '' : 'no-') + 'touch');

				App.Resize.init();
				App.Scroll.init();

				App.Nav.init();

                App.isReady = true;
				(App.WindowLoad.isReady)&&(App.WindowLoad.trigger());
			});

			this.WindowLoad.add('App.Init', function() {

				var isMobile = (App.Resize.current.l == 'm'),
					isDefaultPage = App.Conf.body.hasClass('default-page');

				if(isMobile && !isDefaultPage) {
					App.Scroll.to(App.Nav.elm.offset().top);
				}
			});
		},
		WindowLoad: {
	        init: function() {

				c.log('App.WindowLoad.init');
	            $(window).load(function() {
	                App.WindowLoad.isReady = true;
	                (App.isReady)&&(App.WindowLoad.trigger());
	            });
	        },
	        isReady: false,
			all:[],
			add: function(identifier, f) {

				c.log(' - App.WindowLoad.add: [' + identifier + ']');

				this.all.push(f);
			},
			trigger: function() {

				if(this.all.length == 0)
					return;

				c.info('App.WindowLoad.trigger');

				for(var i in this.all) {
					if(typeof this.all[i] === 'function') {
						this.all[i].call();
					}
				}
			}
		},
		DocReady: {
			init: function(){

				c.log('App.DocReady.init');

				$(document).ready(function() {
					App.DocReady.trigger();
				});
			},
			all:[],
			add: function(identifier, f) {

				c.log(' - App.DocReady.add: [' + identifier + ']');

				this.all.push(f);
			},
			trigger: function() {

				if(this.all.length == 0)
					return;

				c.info('App.DocReady.trigger');

				for(var i in this.all) {
					if(typeof this.all[i] === 'function') {
						this.all[i].call();
					}
				}
			}
		},
		GetPath: function(type, returnArray) {

			type = type || 'full';
			var returnPath = "";

			switch (type) {
				case 'base':
					returnPath = window.location.protocol + '//' + window.location.host;
					break;
				case 'name':
					returnPath = window.location.pathname;
					break;
				case 'basename':
					returnPath = this.GetPath('base') + this.GetPath('name');
					break;
				case 'hash':
					returnPath = window.location.hash;
					break;
				case 'full':
					returnPath = this.GetPath('basename') + this.GetPath('hash');
					break;
			}
			if(returnArray) {
				returnPath = returnPath.split('/').filter(function(s) {
					return s;
				});
			}
			return returnPath;
		},
		Resize: {
			init: function() {

				c.log('App.Resize.init');

				$(window)
				.on(this.e, function(e) {
					App.Resize.update();
				});

				this.current = {
					'h': $(window).prop('innerHeight'),
					'w': $(window).prop('innerWidth')
				};

				this.current.l = this.getLayoutFromSize(this.current);
			},
			getLayoutFromSize: function(size) {

				for(var l in App.Conf.layouts)
					if(size.w.Between(App.Conf.layouts[l]))
						return l;

				c.error("App.Resize: layout not found for: " + size.w + "x" + size.h);
			},
			update: function(immediately) {

				var newSize = {
						'h': $(window).prop('innerHeight'),
						'w': $(window).prop('innerWidth')
					},
					oldSize = this.current,
					layoutChange = false;

				// Width changes only
				if(newSize.w == oldSize.w)
					return;

				newSize.l = this.getLayoutFromSize(newSize);

				layoutChange = newSize.l != oldSize.l;

				this.current = newSize;

				(layoutChange)&&(this.trigger(newSize, oldSize, 'perlayout'));

				this.trigger(newSize, oldSize, 'immediate');

				(this.t)&&(clearTimeout(this.t));
				this.t = setTimeout(function() {
					App.Resize.trigger(newSize, oldSize, 'debounced');
				}, immediately ? 0 : 150);
			},
			e: !!('orientation' in window) ? 'orientationchange resize' : 'resize',
			t: null,
			debounced: {},
			immediate: {},
			perlayout: {},
			add: function(identifier, f, collection) {
				c.log(' - App.Resize.add: [' + identifier + '][' + collection + '] ');
				this[collection][identifier] = f;
			},
			remove: function(identifier, collection) {
				c.log(' - App.Resize.remove: [' + identifier + '][' + collection + '] ');

				if(this[collection][identifier])
					delete this[collection][identifier];
			},
			current: {
				'h': 0,
				'w': 0,
				'l': ''
			},
			trigger: function(newSize, oldSize, collection) {

//  				c.info('App.Resize.trigger: ' + collection;

				for(var i in this[collection])
					if(typeof this[collection][i] === 'function')
						this[collection][i](newSize, oldSize);
			}
		},
        Scroll: {
            init: function() {

                c.log('App.Scroll.init');

                this.current = $(window).scrollTop();

                var Scroll = this;

                $(window).on(this.e, function(e) {

                    var newPosition = $(window).scrollTop(),
                    	oldPosition = Number(Scroll.current);

					Scroll.current = newPosition;

                    Scroll.trigger(newPosition, oldPosition, 'immediate');

                    clearTimeout(Scroll.timer);
                    Scroll.timer = setTimeout(function() {
                        Scroll.trigger(newPosition, oldPosition, 'debounced');
                    }, 150);
                });
            },
            e: 'scroll.AppScroll',
            timer: null,
            debounced: {},
            immediate: {},
            to: function(to, callback, notAnimated) {

                c.info('App.Scroll.to: ' + to + ' animated:' + (!notAnimated ? 'yes' : 'no'));

                var dur = (to != this.current && !notAnimated) ? 650 : 1;

                $('html, body')
                .animate({
                    'scrollTop': to
                }, {
                    duration: dur,
                    easing: "easeInOutExpo",
                    complete: function() {
                        if(callback && typeof callback === 'function') {
                            callback.call();
                            callback = false;
                        }
                    }
                });
            },
			add: function(identifier, f, collection) {

				c.log(' - App.Scroll.add: [' + identifier + '][' + collection + '] ');
				this[collection][identifier] = f;
            },
			remove: function(identifier, collection) {
				c.log(' - App.Scroll.remove: [' + identifier + '][' + collection + '] ');

				if(this[collection][identifier])
					delete this[collection][identifier];
			},
            current: 0,
            trigger: function(newPosition, oldPosition, collection) {

// 				c.info('App.Scroll.trigger.' + collection + ' from ' + oldPosition + ' to ' + newPosition);

				for(var i in this[collection])
					if(typeof this[collection][i] === 'function')
						this[collection][i](newPosition, oldPosition);
            }
        },
	};

	App.Nav = {
		init: function() {
			c.log('App.Nav.init');

			this.sections = App.Conf.body.find('section');

			this.currentIndex = -1;

			App.WindowLoad.add('App.nav', function() {

				App.Scroll.add('App.nav', App.Nav.onScroll.bind(App.Nav), 'immediate');
				App.Resize.add('App.nav', App.Nav.onResize.bind(App.Nav), 'debounced');

				App.Nav.onResize(App.Resize.current, App.Resize.current);
				App.Nav.onScroll(App.Scroll.current, App.Scroll.current);
			});

			this.build();
		},
		build: function() {

			var nav = $('<aside />'),
				heading = $('<li><b>Brand Elements</b></li>'),
				list = $('<ul />');

			heading.appendTo(list);

			this.sections.each(function() {

				var section = $(this),
					id = section.attr('id'),
					li = $('<li />'),
					link = $('<a />'),
					title = section.find('h1').html();

				link
				.attr({
					href: '#' + id,
					title: title
				})
				.html(title)
				.on(App.Conf.clickEvent, function(e) {
					e.preventDefault();

					App.Conf.isHistoryEnabled && history.replaceState(null, title, $(this).attr('href'));
					App.Scroll.to(section.offset().top);
				})
				.appendTo(li);

				li.appendTo(list);
			});

			list.appendTo(nav);

			App.Conf.body.append(nav);
			this.triggers = nav.find('a');
		},
		onResize: function(newSize, oldSize){
			c.log('App.Nav.onResize');

			var screenOffset = newSize.h / 2;

			var offsets = [];

			this.sections.each(function(){
				offsets.push(Math.max(0, ($(this).offset().top - screenOffset)));
			});

			this.offsets = offsets;
		},
		onScroll: function(newPosition, oldPosition){

			var newIndex = this.offsets.length - 1;

			this.offsets.every(function(offset, index){

				if (offset > newPosition) {
					newIndex = Math.max(0, (index - 1));
					return false;
				}

				return true;
			});

			if (newIndex != this.currentIndex) {
				c.log('App.Nav.onScroll:update');

				App.Nav.currentIndex = newIndex;
				App.Nav.update();
			}
		},
		update: function() {

			var activeTrigger = this.triggers.eq(this.currentIndex);

			this.triggers.removeClass('active');
			activeTrigger.addClass('active');

			App.Conf.isHistoryEnabled && history.replaceState(null, activeTrigger.attr('title'), activeTrigger.attr('href'));

			this.sections.removeClass('active').eq(this.currentIndex).addClass('active');
		}
	}

	App.Init();
