// This is the js for the default/index.html view.
var app = function () {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function (a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    // Enumerates an array.
    var enumerate = function (v) {
        var k = 0;
        return v.map(function (e) {
            e._idx = k++;
        });
    };


    self.add_post = function () {
        // We disable the button, to prevent double submission.
        $.web2py.disableElement($("#add-post"));
        var sent_title = self.vue.form_title; // Makes a copy 
        var sent_content = self.vue.form_content; //

        $.post(add_post_url,
            // Data we are sending.
            {
                post_title: self.vue.form_title,
                post_content: self.vue.form_content
            },
            // What do we do when the post succeeds?
            function (data) {
                // Re-enable the button.
                $.web2py.enableElement($("#add-post"));
                // Clears the form.
                self.vue.form_title = "";
                self.vue.form_content = "";
                // Adds the post to the list of posts. 
                var new_post = {
                    id: data.post_id,
                    post_title: sent_title,
                    post_content: sent_content,
                    post_author: data.post_author,
                    can_edit: true, //Whether current user has permission to edit post.
                    editing: false  //Whether post is currently being edited.
                };
                self.vue.post_list.unshift(new_post); //Add new post to front of post_list.
                // We re-enumerate the array.
                self.process_posts();
            }
        );
        // If you put code here, it is run BEFORE the call comes back.
        self.vue.form_set = !self.vue.form_set;
    };


    //My function to add replies. Inspired by the provided add_post function.
    self.add_reply = function(post_idx){
        var p = self.vue.post_list[post_idx];

        reply_content = p._cur_reply;
        $.post(add_reply_url,
        // Data we are sending.
        {
            post_id: p.id,
            reply_content: reply_content
        },
        // What do we do when the post succeeds?
        function (data) {
            p._cur_reply = "";
            var new_reply = {
                id: data.reply_id,
                reply_content: data.reply_content,
                reply_author: data.author,
                editing: false //Whether the reply is currently being edited.
            };

            p._replies.push(new_reply); //Add reply to end of reply list of the associated post.

        });
        p._add_reply = false;
    };


    self.get_posts = function () {
        $.getJSON(get_post_list_url,
            function (data) {
                // I am assuming here that the server gives me a nice list
                // of posts, all ready for display.
                self.vue.post_list = data.post_list;
                // Post-processing.
                self.process_posts();
                console.log("I got my list");
            }
        );
        console.log("I fired the get");
    };

    self.process_posts = function () {
        // This function is used to post-process posts, after the list has been modified
        // or after we have gotten new posts. 
        // We add the _idx attribute to the posts. 
        enumerate(self.vue.post_list);

        // We initialize the smile status to match the like. 
        self.vue.post_list.map(function (e) {
            // I need to use Vue.set here, because I am adding a new watched attribute
            // to an object.  See https://vuejs.org/v2/guide/list.html#Object-Change-Detection-Caveats
            // The code below is commented out, as we don't have smiles any more. 
            // Replace it with the appropriate code for thumbs. 
            // // Did I like it? 
            // // If I do e._smile = e.like, then Vue won't sehje the changes to e._smile .
            // Vue.set(e, '_smile', e.like);
            Vue.set(e, '_thumb', e.thumb); //Post's real-time thumb status.
            Vue.set(e, '_show_replies', false); //Boolean for displaying the post's replies.
            Vue.set(e, '_add_reply', false); //Boolean for whether current user can add a reply.
            Vue.set(e, '_cur_reply', ""); //Text of new reply.
            Vue.set(e, '_replies', []); //List of the post's replies.

        });
    };


    //Toggle the new post form
    self.toggle_form = function () {
        console.log("Form toggle pressed");
        self.vue.form_set = !self.vue.form_set;
    };


    //Thumb up functions
    self.thumb_up_mouseover = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p._thumb = 'u';
    };


    self.thumb_up_mouseout = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p._thumb = p.thumb;
    };


    self.thumb_up_click = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        console.log(p.thumb);
        if (p.thumb == 'u') {
            p.thumb = null;
            console.log(p._thumb_count);
            p._thumb_count -= 1;
        }
        else {
            p.thumb = 'u';
            p._thumb_count += 1;

        }
        $.post(set_thumb_url, {
            post_id: p.id,
            state: p.thumb
        });
        // self.get_thumb_entries();
        console.log('post thumb');
        console.log(p.thumb);
    };


    //Thumb down functions
    self.thumb_down_mouseover = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        p._thumb = 'd';
    };


    self.thumb_down_mouseout = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        if (!p._thumb_down_db_entry) {
            p._thumb_down = false;
        }
        p._thumb = p.thumb;
    };


    self.thumb_down_click = function (post_idx) {
        var p = self.vue.post_list[post_idx];
        if (p.thumb == 'd') {
            p.thumb = null;
        }
        else {
            p.thumb = 'd';
        }
        $.post(set_thumb_url, {
            post_id: p.id,
            state: p.thumb
        });
        //self.get_thumb_entries();
        console.log('post thumb');
        console.log(p.thumb);
    };


    //Get all thumb entries for current user session
    self.get_thumb_entries = function () {
        $.getJSON(get_thumb_entries_url, function (data) {
            self.vue.thumb_entries = data.thumb_entries;
        })
    };


    //Determine the db thumb count for post_idx
    self.get_thumb_count = function (post_idx) {
        var count = 0;
        var p = self.vue.post_list[post_idx];

        if (p._thumb == 'u') {
            count++;
        }
        else if (p._thumb == 'd') {
            count--;
        }

        for (var i = 0; i < self.vue.thumb_entries.length; i++) {
            var thumb = self.vue.thumb_entries[i];
            console.log(thumb.id);
            if (thumb.post_id == p.id) {
                if (thumb.thumb_state == 'u') {
                    count++;
                }
                else if (thumb.thumb_state == 'd') {
                    count--;
                }
            }
        }
        return count;
    };


    //Toggle a post's edit button (between edit and submit).
    //When toggling from submit to edit, send the updated post content to the db.
    self.toggle_edit = function(post_idx){
      var p = self.vue.post_list[post_idx];
      console.log(p.can_edit);
      if(p.can_edit){
          if(p.editing){
              //Modify the post's content
            $.post(edit_post_url, {
                post_id: p.id,
                new_content: p.post_content
            });

          }
          p.editing = !p.editing;
      }
    };


    self.show_replies = function(post_idx){
        var p = self.vue.post_list[post_idx];
        //Get all replies associated with p.id
        if(!p._show_replies){
            $.getJSON(get_replies_url,
            // Data we are sending.
            {
                post_id: p.id
            },
            // What do we do when the post succeeds?
            function (data) {
                p._replies = data.reply_list;
            });
        }
        console.log(p._replies);
        p._show_replies = true;
    };


    self.hide_replies = function(post_idx){
        var p = self.vue.post_list[post_idx];
        p._show_replies = false;
    };


    self.toggle_add_reply = function(post_idx){
        var p = self.vue.post_list[post_idx];

        p._add_reply = !p._add_reply;

    };


    self.edit_reply = function(post_idx, reply_id){
        var p = self.vue.post_list[post_idx];
        var r_idx; //index of the reply with reply_id in p's reply list.
        for(r_idx = 0; r_idx < p._replies.length; r_idx++){
            if(p._replies[r_idx].id == reply_id){
                break;
            }
        }

        var r = p._replies[r_idx];

        if(r.editing) {
            r.editing = false;
            console.log("reply idx");
            console.log(r_idx);
            // Modify the reply's content
            $.post(edit_reply_url, {
                reply_id: r.id,
                new_content: r.reply_content
            });
        }
        else{
            r.editing = true;
        }

        p._replies[r_idx] = r;
    };


    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            form_set: false, //Boolean for displaying new post form
            add_btn_show: false, //Boolean for displaying add post button
            form_title: "",
            form_content: "",
            post_list: [],
            thumb_entries: [] //List to which get_thumb_entries writes to.

        },
        methods: {
            add_post: self.add_post,
            toggle_form: self.toggle_form,
            thumb_up_mouseover: self.thumb_up_mouseover,
            thumb_up_mouseout: self.thumb_up_mouseout,
            thumb_up_click: self.thumb_up_click,
            thumb_down_mouseover: self.thumb_down_mouseover,
            thumb_down_mouseout: self.thumb_down_mouseout,
            thumb_down_click: self.thumb_down_click,
            get_thumb_count: self.get_thumb_count,
            get_thumb_entries: self.get_thumb_entries,
            toggle_edit: self.toggle_edit,
            show_replies: self.show_replies,
            hide_replies: self.hide_replies,
            toggle_add_reply: self.toggle_add_reply,
            add_reply: self.add_reply,
            edit_reply: self.edit_reply
        }


    });

    // If we are logged in, shows the form to add posts.
    if (is_logged_in) {
        // $.web2py.disableElement($("#add-post"));
        self.vue.add_btn_show = true;
        // $("#add_post").show();
    }
    else {
        self.vue.add_btn_show = false;
    }

    // Gets the posts.
    self.get_posts();

    //Get thumb entries for current user session
    self.get_thumb_entries();

    return self;
};

var APP = null;

// No, this would evaluate it too soon.
// var APP = app();

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function () {
    APP = app();
});