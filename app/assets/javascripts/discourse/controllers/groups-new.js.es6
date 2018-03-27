import { popupAjaxError } from 'discourse/lib/ajax-error';
import computed from 'ember-addons/ember-computed-decorators';
import User from "discourse/models/user";
import InputValidation from 'discourse/models/input-validation';
import debounce from 'discourse/lib/debounce';

export default Ember.Controller.extend({
  disableSave: null,

  aliasLevelOptions: [
    { name: I18n.t("groups.alias_levels.nobody"), value: 0 },
    { name: I18n.t("groups.alias_levels.mods_and_admins"), value: 2 },
    { name: I18n.t("groups.alias_levels.members_mods_and_admins"), value: 3 },
    { name: I18n.t("groups.alias_levels.everyone"), value: 99 }
  ],

  visibilityLevelOptions: [
    { name: I18n.t("groups.visibility_levels.public"), value: 0 },
    { name: I18n.t("groups.visibility_levels.members"), value: 1 },
    { name: I18n.t("groups.visibility_levels.staff"), value: 2 },
    { name: I18n.t("groups.visibility_levels.owners"), value: 3 }
  ],

  @computed('model.visibility_level', 'model.public_admission')
  disableMembershipRequestSetting(visibility_level, publicAdmission) {
    visibility_level = parseInt(visibility_level);
    return (visibility_level !== 0) || publicAdmission;
  },

  @computed('basicNameValidation', 'uniqueNameValidation')
  nameValidation(basicNameValidation, uniqueNameValidation) {
    return uniqueNameValidation ? uniqueNameValidation : basicNameValidation;
  },

  @computed('model.name')
  basicNameValidation(name) {
    if (name === undefined) {
      return this._failedInputValidation();
    };

    if (name === "") {
      this.set('uniqueNameValidation', null);
      return this._failedInputValidation(I18n.t('groups.new.name.blank'));
    }

    if (name.length < this.siteSettings.min_username_length) {
      return this._failedInputValidation(I18n.t('groups.new.name.too_short'));
    }

    if (name.length > this.siteSettings.max_username_length) {
      return this._failedInputValidation(I18n.t('groups.new.name.too_long'));
    }

    this.checkGroupName();

    return this._failedInputValidation(I18n.t('groups.new.name.checking'));
  },

  checkGroupName: debounce(function() {
    User.checkUsername(this.get('model.name')).then(response => {
      const validationName = 'uniqueNameValidation';

      if (response.available) {
        this.set(validationName, InputValidation.create({
          ok: true,
          reason: I18n.t('groups.new.name.available')
        }));

        this.set('disableSave', false);
      } else {
        let reason;

        if (response.errors) {
          reason = response.errors.join(' ');
        } else {
          reason = I18n.t('groups.new.name.not_available');
        }

        this.set(validationName, this._failedInputValidation(reason));
      }
    });
  }, 500),

  _failedInputValidation(reason) {
    this.set('disableSave', true);

    const options = { failed: true };
    if (reason) options.reason = reason;
    return InputValidation.create(options);
  },

  actions: {
    save() {
      this.set('disableSave', true);
      const group = this.get('model');

      group.create().then(() => {
        this.transitionToRoute("group.members", group.name);
      }).catch(popupAjaxError)
        .finally(() => this.set('disableSave', false));
    },
  }
});
