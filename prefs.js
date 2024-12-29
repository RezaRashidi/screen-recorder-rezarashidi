import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import Pango from 'gi://Pango';
import _ from 'gettext';
export default class ScreenRecorderPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.screen-recorder');

        // Create a preferences page
        const page = new Adw.PreferencesPage();
        window.add(page);

        // Create a preferences group
        const group = new Adw.PreferencesGroup();
        page.add(group);

        // Create a spin button for framerate
        this._addSpinButton(group, settings, 'framerate', 'Framerate', 'Set the framerate for screen recording', 1, 60);

        // Create a dropdown for codec
        this._addDropdown(group, settings, 'codec', 'Codec', 'Set the codec for screen recording', [
            ['libx264', 'H.264'],
            ['libx265', 'H.265'],
            ['libvpx-vp9', 'VP9']
        ]);

        // Create a dropdown for quality
        this._addDropdown(group, settings, 'quality', 'Quality', 'Set the quality for screen recording', [
            ['0', 'Lossless'],
            ['23', 'High'],
            ['30', 'Medium'],
            ['37', 'Low']
        ]);

        // Create a dropdown for preset
        this._addDropdown(group, settings, 'preset', 'Preset', 'Set the encoding preset for screen recording', [
            ['ultrafast', 'Ultrafast'],
            ['superfast', 'Superfast'],
            ['veryfast', 'Very Fast'],
            ['faster', 'Faster'],
            ['fast', 'Fast'],
            ['medium', 'Medium'],
            ['slow', 'Slow'],
            ['slower', 'Slower'],
            ['veryslow', 'Very Slow']
        ]);

        // Create a file chooser for destination directory
        this._addFileChooser(group, settings, 'destination-dir', 'Destination Directory', 'Choose where to save screen recordings');

        this._addMonitorSelector(group, settings);
        this._addSwitch(group, settings, 'auto-record', 'Auto-record on startup', 'Automatically start recording when the extension is enabled');
        this._addSwitch(group, settings, 'use-persian-format', 'Use Persian date format', 'Toggle to use Persian date format for file naming');


        this._addSwitch(group, settings, 'use-hw-accel', 'Use hardware acceleration', 'Enable hardware-accelerated encoding if available');
        
        this._addDropdown(group, settings, 'hw-accel-method', 'Hardware acceleration method', 'Select the hardware acceleration method to use', [
            ['vaapi', 'VAAPI'],
            ['nvenc', 'NVENC'],
        ]);
        
        this._addDropdown(group, settings, 'hw-accel-codec', 'Hardware-accelerated codec', 'The hardware-accelerated codec to use', [
            ['h264_vaapi', 'H.264 (VAAPI)'],
            ['hevc_vaapi', 'HEVC (VAAPI)'],
            ['h264_nvenc', 'H.264 (NVENC)'],
            ['hevc_nvenc', 'HEVC (NVENC)'],

        ]);
    }

    _addSpinButton(group, settings, key, title, subtitle, min, max) {
        const row = new Adw.ActionRow({ title, subtitle });
        group.add(row);

        const adjustment = new Gtk.Adjustment({
            lower: min,
            upper: max,
            step_increment: 1
        });

        const spinButton = new Gtk.SpinButton({
            adjustment,
            climb_rate: 1,
            digits: 0,
            numeric: true
        });
        row.add_suffix(spinButton);
        row.activatable_widget = spinButton;

        settings.bind(key, spinButton, 'value', Gio.SettingsBindFlags.DEFAULT);
    }

    _addDropdown(group, settings, key, title, subtitle, options) {
        const row = new Adw.ActionRow({ title, subtitle });
        group.add(row);

        const model = new Gtk.StringList();
        options.forEach(([, label]) => model.append(label));

        const dropdown = new Gtk.DropDown({ model });
        row.add_suffix(dropdown);
        row.activatable_widget = dropdown;

        settings.bind(key, dropdown, 'selected', Gio.SettingsBindFlags.DEFAULT);

        dropdown.connect('notify::selected', () => {
            const selected = dropdown.get_selected();
            if (selected >= 0 && selected < options.length) {
                settings.set_string(key, options[selected][0]);
            }
        });

        // Set initial selection
        const currentValue = settings.get_string(key);
        const index = options.findIndex(([value]) => value === currentValue);
        if (index !== -1) {
            dropdown.set_selected(index);
        }
    }


_addFileChooser(group, settings, key, title, subtitle) {
    const row = new Adw.ActionRow({ title, subtitle });
    group.add(row);

    const button = new Gtk.Button({ label: 'Choose' });
    row.add_suffix(button);

    const pathLabel = new Gtk.Label({
        ellipsize: Pango.EllipsizeMode.MIDDLE,
        max_width_chars: 30,
        hexpand: true,
        xalign: 0,
        valign: Gtk.Align.CENTER
    });
    row.add_suffix(pathLabel);
    button.connect('clicked', () => {
        const dialog = new Gtk.FileChooserNative({
            title: 'Select Destination Directory',
            action: Gtk.FileChooserAction.SELECT_FOLDER,
            transient_for: button.get_root(),
            modal: true,
        });

        dialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                const file = dialog.get_file();
                const path = file.get_path();
                settings.set_string(key, path);
                this._updateDestinationLabel(pathLabel, path);
            }
        });

        dialog.show();
    });

    let currentPath = settings.get_string('destination-dir');
    if (!currentPath) {
        const homeDir = GLib.get_home_dir();
        currentPath = GLib.build_filenamev([homeDir, 'Videos', 'ScreenRecord']);
        settings.set_string('destination-dir', currentPath);
        
        // Create the directory if it doesn't exist
        const file = Gio.File.new_for_path(currentPath);
        if (!file.query_exists(null)) {
            file.make_directory_with_parents(null);
        }
    }

    // Display current path
    this._updateDestinationLabel(pathLabel, currentPath);

    // Ensure the button is always visible
    button.set_hexpand(false);
}

_updateDestinationLabel(label, path) {
    label.set_label(path);
    label.set_tooltip_text(path);
}




_addMonitorSelector(group, settings) {
    const row = new Adw.ActionRow({
        title: "Monitor to Record",
        subtitle: "Choose which monitor to record, or select all monitors"
    });
    group.add(row);

    const model = new Gtk.StringList();
    const dropdown = new Gtk.DropDown({ model });
    row.add_suffix(dropdown);
    row.activatable_widget = dropdown;

    const updateMonitorOptions = () => {
        const monitorCount = settings.get_int('monitor-count');
        const selectedMonitor = settings.get_int('selected-monitor');
        
        model.splice(0, model.get_n_items(), ["All Monitors"]);
        for (let i = 0; i < monitorCount; i++) {
            model.append(`Monitor ${i + 1}`);
        }

        if (selectedMonitor >= monitorCount) {
            settings.set_int('selected-monitor', -1);
            dropdown.set_selected(0);
        } else {
            dropdown.set_selected(selectedMonitor + 1);
        }
    };

    updateMonitorOptions();

    dropdown.connect('notify::selected', () => {
        const selected = dropdown.get_selected();
        settings.set_int('selected-monitor', selected - 1);
    });

    settings.connect('changed::monitor-count', updateMonitorOptions);
    settings.connect('changed::selected-monitor', updateMonitorOptions);
}

_addSwitch(group, settings, key, title, subtitle) {
    const row = new Adw.ActionRow({ title, subtitle });
    group.add(row);
    const toggle = new Gtk.Switch({
        active: settings.get_boolean(key),
        valign: Gtk.Align.CENTER,
    });
    row.add_suffix(toggle);
    row.activatable_widget = toggle;
    settings.bind(
        key,
        toggle,
        'active',
        Gio.SettingsBindFlags.DEFAULT
    );
}




}