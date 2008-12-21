/*
    Slideshow.js
    
    A generic, lightweight, customizable slideshow built atop MooTools.
    
    Dependencies: MooTools
*/

var activeSlideshows = [];

var Slideshow = new Class({
    Implements: [Events, Options],
    
    options: {
        carousel: null,
        carouselActiveClass: 'active',
        titleHolder: null,
        imageHolder: null,
        captionHolder: null,
        autoShowFirstSlide: true,
        transitionType: Fx.Transitions.Cubic.easeInOut,
        transitionDuration: 100,
        slideDuration: 4000,
        keepInitialSlide: false,
        startShow: false
    },
    
    initialize: function(data, options){
        this.setOptions(options);
        this.imageData = data;
        this.carouselInUse = $defined(this.options.carousel);
        this.titleInUse = $defined(this.options.titleHolder);
        this.captionInUse = $defined(this.options.captionHolder);
        this.carouselInit();
        if (this.options.autoShowFirstSlide) {
            // Show the first slide if autoShowFirstSlide is true
            if (!this.options.keepInitialSlide){
                this.showImage(this.imageData[0], false);
            }
            if (this.options.startShow){
                this.startShow();
            }
        }
        activeSlideshows.push(this);
        // Preload all of the images in the show
        $each(this.imageData, function(imageData){
            var preloaded_image = new Image();
            preloaded_image.src = imageData.image;
        }, this);
    },
    
    /* ----------
       NAVIGATION
       ---------- */
    activeIndex: null,
    removeImages: function(callback, callback_arg){
        // Removes any images currently in the holder (fades them out)
        // Optionally pass a callback to be called when the animation is complete
        var children = this.options.imageHolder.getElements('*');
        if (children.length < 1){
            // Nothing to be removed
            this.options.imageHolder.empty(); // Just in case...
            if ($defined(callback)){
                // If a callback was defined, call it
                callback(callback_arg);
            }
        } else {
            $each(children, function(el){
                var child_tween = new Fx.Tween(el, {
                    property: 'opacity',
                    transition: this.options.transitionType,
                    duration: this.options.transitionDuration,
                    link: 'ignore'
                }).start(0);
            }, this);
            var _self = this;
            // Empty the elements for good after the animation has completed
            setTimeout(function(){
                _self.options.imageHolder.empty();
                if ($defined(callback)){
                    // If a callback was defined, call it
                    callback(callback_arg);
                }
            }, 100);
        }
        return true;
    },
    getCurrentImage: function(){
        // Returns the image data-set from imageData of the image currently shown
        if ($defined(this.activeIndex)){
            var index = (this.activeIndex > -1) ? this.activeIndex : 0;
            return this.imageData[index];
        } else if (!this.carouselInUse){
            return null;
        } else {
            var active_el = this.options.carousel.getElements('li.active');
            if (active_el.length > 0){
                return this.options.carousel.getElements('li.active')[0].retrieve('image');
            } else {
                return null;
            }
        }
    },
    showImage: function(imageData, animate){
        // Shows the image passed in. Image should be one of the image data-sets
        // from the initial data list.
        var current_image_el = this.options.imageHolder.getElements('img');
        if ($defined(current_image_el)){
            this.options.imageHolder.setProperty('min-height', (current_image_el.getHeight() + 'px'));
        }
        var image_el_img = new Element('img', {
            'src': imageData.image,
            'alt': $defined(imageData.title) ? imageData.title : 'Slideshow Image'
        });
        image_el_img.store('slideshow', this);
        image_el_img.store('imageData', imageData);
        if ($defined(imageData.link)){
            // If there is a link, wrap the img in a link tag
            var image_el_a = new Element('a', {
                'href': imageData.link,
                'title': imageData.title
            });
            image_el_a.grab(image_el_img);
            var image_el = image_el_a;
        } else {
            image_el = image_el_img;
        }
        image_el.setStyle('opacity', 0);
        // Inject into the DOM, as hidden for now
        // Create the callback to be called when emptying the image holder has finished
        this.removeImages(function(args){
            args._self.options.imageHolder.grab(image_el);
            args._self.activeIndex = args._self.imageData.indexOf(imageData);
            args._self.activeIndex = (args._self.activeIndex > -1) ? args._self.activeIndex : 0;
            if ($defined(animate) ? animate : true){
                var animation = new Fx.Tween(args.image_el, {
                    property: 'opacity',
                    transition: args._self.options.transitionType,
                    duration: args._self.options.transitionDuration,
                    link: 'ignore'
                }).start(1);
            } else {
                // If no animation is needed, immediately set the opacity
                args.image_el.setStyle('opacity', 1);
            }
        }, { _self: this, image_el: image_el });
        this.carouselSetActive(imageData); // Update the carousel
        this.titleSet(imageData); // Update the title
        this.captionSet(imageData); // Update the caption
        return true;
    },
    showNextImage: function(){
        // Shows the next image in the slideshow. The order is defined by the initial ordering
        // of image data-sets in the imageData passed-in on initialization.
        var current_image = this.getCurrentImage();
        var next_index = current_image ? (this.imageData.indexOf(current_image) + 1) : 0;
        next_index = ((next_index + 1) > this.imageData.length) ? 0 : next_index;
        var imageData = this.imageData[next_index];
        if (imageData.image == this.options.imageHolder.getElements('img')[0].getProperty('src')){
            // Try not to show the same image twice
            imageData = this.imageData[(((next_index + 1) > this.imageData.length) ? 0 : (next_index + 1))];
        }
        return this.showImage(this.imageData[next_index]);
    },
    
    /* --------
       CAROUSEL
       -------- */
    carouselInUse: false,
    carouselAppend: function(image){
        // Appends the specified image (which should be an image data-set from the initial
        // data list).
        var list_item = new Element('li', {
            'class': ('carousel item index-' + this.imageData.indexOf(image))
        });
        // Store the slideshow and the represented image in the element data store
        list_item.store('slideshow', this);
        list_item.store('image', image);
        var link = new Element('a', {
            'href': '#',
            'onclick': 'this.retrieve(\'slideshow\').carouselNavigate(this); return false;'
        });
        // Also store it in the link, as this is the trigger
        link.store('slideshow', this);
        link.store('image', image);
        var thumb = new Element('img', {
            'src': image.thumbnail,
            'alt': $defined(image.title) ? image.title : 'Thumbnail'
        });
        // Inject the elements (ul > li > a > img)
        link.grab(thumb);
        list_item.grab(link);
        this.options.carousel.grab(list_item, 'bottom');
        return true;
    },
    carouselInit: function(){
        // Initializes the carousel (which has to be ol/ul), populating it with
        // the image navigation triggers
        if (!this.carouselInUse){
            // If we're not using the carousel, return false
            return false;
        } else {
            // Empty the carousel of any content it may already have
            this.options.carousel.empty();
            this.imageData.each(function(el){
                this.carouselAppend(el);
            }, this);
            return true;
        }
    },
    carouselSetActive: function(image){
        // Sets the active class to the appropriate thumbnail in the carousel, from the
        // passed image data-set.
        if (!this.carouselInUse){
            // If we're not using the carousel, return false
            return false;
        } else {
            $each(this.options.carousel.getElements('li.' + this.options.carouselActiveClass), function(el){
                // Remove the active class from any elements which have it already.
                el.removeClass(this.options.carouselActiveClass);
            }, this);
            this.options.carousel.getElements('li.carousel.item.index-' + this.imageData.indexOf(image)).addClass(this.options.carouselActiveClass);
            return true;
        }
    },
    carouselNavigate: function(trigger){
        // Triggers nagigation of the slideshow to the image of the passed trigger.
        if (!trigger.getParent('li').hasClass('active')){
            // Only navigate if they didn't click on an imahe which was already active
            return this.showImage(trigger.retrieve('image'));
        }
    },
    
    /* ------
       TITLES
       ------ */
    titleInUse: false,
    titleSet: function(imageData){
        // Sets the title appropriately for the passed-in image data-set
        if (!this.titleInUse){
            // If no title is in use do nothing
            return false;
        } else {
            var animation = new Fx.Tween(this.options.titleHolder, {
                property: 'opacity',
                transition: this.options.transitionType,
                duration: this.options.transitionDuration,
                link: 'chain'
            });
            animation.start(0);
            var _self = this;
            setTimeout(function(){
                _self.options.titleHolder.set('html', imageData.title);
                animation.start(1);
            }, this.options.transitionDuration);
            return true;
        }
    },
    
    /* --------
       CAPTIONS
       -------- */
    captionInUse: false,
    captionSet: function(imageData){
        // Sets the caption appropriately for the passed-in image data-set
        if (!this.captionInUse){
            // Do nothing is captions are not in use
            return false;
        } else {
            var animation = new Fx.Tween(this.options.captionHolder, {
                property: 'opacity',
                transition: this.options.transitionType,
                duration: this.options.transitionDuration,
                link: 'chain'
            });
            animation.start(0);
            var _self = this;
            setTimeout(function(){
                _self.options.captionHolder.set('html', imageData.caption);
                animation.start(1);
            }, this.options.transitionDuration);
            return true;
        }
    },
    
    /* ---------
       AUTO-SHOW
       --------- */
    timerID: null,
    showWasActive: false,
    moveOnShowFunction: function(){
        this.showNextImage();
        this.timerID = this.moveOnShowFunction.delay(this.options.slideDuration, this);
    },
    startShow: function(){
        // Sets up the show
        this.showWasActive = true;
        this.timerID = this.moveOnShowFunction.delay(this.options.slideDuration, this);
    },
    pauseShow: function(){
        // Pause a running slideshow
        if ($defined(this.timerID)){
            $clear(this.timerID);
            this.timerID = null;
        }
    },
    resumeShow: function(){
        // If the show was ever running, resume it
        if (this.showWasActive){
            this.startShow();
        }
    }
});

var pauseAllSlideshows = function(){
    // Pauses all running slideshows on the page
    $each(activeSlideshows, function(show){
        show.pauseShow();
    });
};

var resumeAllSlideshows = function(){
    // Resumes all running slideshows on the page
    $each(activeSlideshows, function(show){
        show.resumeShow();
    });
};
