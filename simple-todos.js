Tasks = new Mongo.Collection('tasks');

if (Meteor.isClient) {
  Meteor.subscribe("tasks");
  Template.body.helpers({
    tasks: function () {
      if (Session.get("hideCompleted")) {
        return Tasks.find({checked: {$ne: true}}, {sort: {createdAt: -1}});
      } else {
        return Tasks.find({}, {sort: {createdAt: -1}});
      }
    },
    hideCompleted: function () {
      return Session.get("hideCompleted");
    },
    incompleteCount: function () {
      return Tasks.find({checked: {$ne: true}}).count();
    }
  });

  Template.body.events({
    "submit .new-task": function (event) {
      var text = event.target.text.value;

      console.log("about to call addTask");
      Meteor.call("addTask", text);

      event.target.text.value = "";

      // prevent default form submit (talks to web browser)
      return false;
    },
    "change .hide-completed input": function (event) {
      Session.set("hideCompleted", event.target.checked);
      console.log("hideCompleted now: " + event.target.checked);
    }
  });

  Template.task.events({
    "click .toggle-checked": function () {
      try {
        Meteor.call("setChecked", this._id, ! this.checked);
      } catch (error) {
        console.log("cannot set checked");
      }
    },
    "click .delete": function () {
      Meteor.call("deleteTask", this._id);
    },
    "click .toggle-private": function () {
      Meteor.call("setPrivate", this._id, ! this.isPrivate);
    }
  });

  Template.task.helpers({
    isOwner: function () {
      return this.owner === Meteor.userId();
    }
  });

  Accounts.ui.config({
    passwordSignupFields: "USERNAME_ONLY"
  });
} /* Meteor.isClient */

if (Meteor.isServer) {
  Meteor.publish("tasks", function () {
    return Tasks.find({
      $or: [
        { isPrivate: {$ne: true} },
        { owner: this.userId }
      ]
    });
  })
}

Meteor.methods({
  addTask: function (text) {
    if (! Meteor.userId()) {
      throw new Meteor.Error("not-authorized");
    }

    Tasks.insert({
      text: text,
      createdAt: new Date(),
      owner: Meteor.userId(),
      username: Meteor.user().username,
      checked: false,
      isPrivate: true
    });
  },
  authorizeToEditTask: function (taskId) {
    var task = Tasks.findOne(taskId);

    if (task.owner !== Meteor.userId()) {
      console.log("not-authorized error");
      throw new Meteor.Error("not-authorized");
    }
  },
  deleteTask: function (taskId) {
    Meteor.call("authorizeToEditTask", taskId);
    Tasks.remove(taskId);
  },
  setChecked: function (taskId, setChecked) {
    Meteor.call("authorizeToEditTask", taskId);
    console.log("setting setChecked to " + setChecked);
    Tasks.update(taskId, { $set: {checked: setChecked} });
  },
  setPrivate: function (taskId, isItPrivate) {
    Meteor.call("authorizeToEditTask", taskId);
    Tasks.update(taskId, { $set: { isPrivate: isItPrivate } })
  }
});


