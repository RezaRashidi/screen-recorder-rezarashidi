/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import GObject from "gi://GObject";
import St from "gi://St";
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import Gtk from "gi://Gtk";
import Adw from "gi://Adw";
import {
  Extension,
  gettext as _,
} from "resource:///org/gnome/shell/extensions/extension.js";
import * as PanelMenu from "resource:///org/gnome/shell/ui/panelMenu.js";
import * as PopupMenu from "resource:///org/gnome/shell/ui/popupMenu.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";
import Shell from "gi://Shell";
import * as Signals from "resource:///org/gnome/shell/misc/signals.js";
const ScreenRecorder = GObject.registerClass(
  class ScreenRecorder extends PanelMenu.Button {
    _init(extension, settings) {
      super._init(0.0, _("Screen Recorder"));
      this._extension = extension;
      this._settings = settings;
      this._isRecording = false;
      this._proc = null;
      this._startTime = null;
      this._outputFile = null;

      // this._blankCheckId = null;

      this._isPaused = false; // Add this line

      // this._screenShieldSignals323 = [
      //   Main.screenShield.connect('lock-status-changed', () => {
      //     log('[ScreenRecorder] Lock status changed');
      //   }),
      //   Main.screenShield.connect('active-changed', () => {
      //     log('[ScreenRecorder] Active status changed');
      //   }),
      //   Main.screenShield.connect('wake-up-screen', () => {
      //     log('[ScreenRecorder] Screen woke up');
      //   }),
      //   Main.screenShield.connect('lock-screen', () => {
      //     log('[ScreenRecorder] Screen locked');
      //   }),
      //   Main.screenShield.connect('unlock-screen', () => {
      //     log('[ScreenRecorder] Screen unlocked');
      //   })
      // ];

      // this._screenShieldSignals = [
      //   Main.screenShield.connect('lock-status-changed', this._handleScreenBlank.bind(this)),
      //   Main.screenShield.connect('active-changed', this._handleScreenUnblank.bind(this))
      // ];

      this._screenShieldSignal = Main.screenShield.connect(
        "active-changed",
        () => {
          if (this._isScreenBlank === undefined) {
            this._isScreenBlank = true;
            this._handleScreenBlank();
          } else {
            this._isScreenBlank = !this._isScreenBlank;
            if (this._isScreenBlank) {
              this._handleScreenBlank();
            } else {
              this._handleScreenUnblank();
            }
          }
        }
      );
      // this._screenShieldSignals = Main.screenShield.connect('unlock-screen', () => {
      // log(`[ScreenRecorder] _is unlock-screen`)
      // this._toggleRecording()
      // })

      this._icon = new St.Icon({
        icon_name: "media-record-symbolic",
        style_class: "system-status-icon",
      });

      this.add_child(this._icon);

      this._startStopItem = new PopupMenu.PopupMenuItem(_("Start Recording"));
      this._startStopItem.connect("activate", this._toggleRecording.bind(this));
      this.menu.addMenuItem(this._startStopItem);
      // Add the preferences menu item
      this._prefsItem = new PopupMenu.PopupMenuItem(_("Preferences"));
      this._prefsItem.connect("activate", this._openPreferences.bind(this));
      this.menu.addMenuItem(this._prefsItem);
      // Add option to open output directory
      this._openOutputDirItem = new PopupMenu.PopupMenuItem(
        _("Open Output Directory")
      );
      this._openOutputDirItem.connect(
        "activate",
        this._openOutputDirectory.bind(this)
      );
      this.menu.addMenuItem(this._openOutputDirItem);
    }
    _openOutputDirectory() {
      let destinationDir = this._settings.get_string("destination-dir");
      if (!destinationDir) {
        const homeDir = GLib.get_home_dir();
        destinationDir = GLib.build_filenamev([
          homeDir,
          "Videos",
          "ScreenRecord",
        ]);
      }

      const file = Gio.File.new_for_path(destinationDir);

      if (file.query_exists(null)) {
        try {
          Gio.AppInfo.launch_default_for_uri(`file://${destinationDir}`, null);
        } catch (e) {
          logError(e, "Failed to open output directory");
          Main.notifyError(_("Error"), _("Failed to open output directory"));
        }
      } else {
        Main.notifyError(_("Error"), _("Output directory does not exist"));
      }
    }
    // Add these methods to the ScreenRecorder class

    _toggleRecording() {
      if (this._isRecording) {
        this._stopRecording();
      } else {
        this._startRecording();
      }
    }
    _handleScreenBlank() {
      log("[ScreenRecorder] Screen blanked");
      log(
        `[ScreenRecorder] _isRecording: ${this._isRecording}, _isPaused: ${this._isPaused}`
      );

      if (this._isRecording) {
        this._isPaused = true;
        this._stopRecording();
      }
    }

    _handleScreenUnblank() {
      log("[ScreenRecorder] Screen unblanked");
      log(
        `[ScreenRecorder] _isRecording: ${this._isRecording}, _isPaused: ${this._isPaused}`
      );
      if (this._isPaused) {
        // Add a 10-second delay before starting the recording

        if (this._isPaused) {
          // Check again after the delay
          this._startRecording();
          this._isPaused = false;

          log(
            "[ScreenRecorder] Recording resumed after delay, _isRecording set to true, _isPaused set to false"
          );
        } else {
          log("[ScreenRecorder] Recording not resumed: no longer paused");
        }
      } else {
        log("[ScreenRecorder] Screen unblanked but recording was not paused");
      }
    }

    _stopRecording() {
      log("[ScreenRecorder] Stopping recording...");
      if (!this._isRecording) {
        log("[ScreenRecorder] Not recording, nothing to stop");
        return;
      }

      if (this._proc) {
        log("[ScreenRecorder] Stopping recording process");

        this._proc.send_signal(15); // SIGTERM
        this._proc = null;
      }

      this._isRecording = false;

      log(
        "[ScreenRecorder] Recording stopped, _isRecording and _isPaused set to false"
      );
      this._icon.icon_name = "media-record-symbolic";
      this._icon.set_style(""); // Remove the red color
      this._startStopItem.label.text = _("Start Recording");

      // Rename the file to include end time
      this._renameOutputFile();
    }

    _renameOutputFile() {
      const endTime = new Date();
      const formatter = new Intl.DateTimeFormat("fa-IR-u-nu-latn", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const parts = formatter.formatToParts(endTime);
      const hour = parts.find((part) => part.type === "hour").value;
      const minute = parts.find((part) => part.type === "minute").value;
      const endTimestamp = `${hour}:${minute}`;

      const fileNameWithoutExtension = this._outputFile.replace(/\.mkv$/, "");
      const newFileName = `${fileNameWithoutExtension}-${endTimestamp}.mkv`;

      try {
        const file = Gio.File.new_for_path(this._outputFile);
        const newFile = Gio.File.new_for_path(newFileName);
        file.move(newFile, Gio.FileCopyFlags.NONE, null, null);
        log(`[ScreenRecorder] Output file renamed to: ${newFileName}`);
      } catch (e) {
        logError(e, "[ScreenRecorder] Failed to rename output file");
      }
      this._startTime = null;
      this._outputFile = null;
    }

    _openPreferences() {
      this._extension.openPreferences();
    }

    _startRecording() {
      if (this._isRecording) {
        log("[ScreenRecorder] Already recording, not starting a new recording");
        return;
      }
      this._startTime = GLib.DateTime.new_now_local();

      const usePersianFormat = this._settings.get_boolean("use-persian-format");
      const locale = usePersianFormat ? "fa-IR-u-nu-latn" : "en-US";
      const formatter = new Intl.DateTimeFormat(locale, {
        year: "numeric",
        month: "long",
        weekday: "long",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const numericMonthFormatter = new Intl.DateTimeFormat(locale, {
        month: "2-digit",
      });
      const parts = formatter.formatToParts(new Date());
      const year = parts.find((part) => part.type === "year").value;
      const month = parts.find((part) => part.type === "month").value;
      const weekday = parts.find((part) => part.type === "weekday").value;
      const day = parts.find((part) => part.type === "day").value;
      const hour = parts.find((part) => part.type === "hour").value;
      const minute = parts.find((part) => part.type === "minute").value;
      const second = parts.find((part) => part.type === "second").value;
      const numericMonth = numericMonthFormatter.format(new Date());
      const homeDir = GLib.get_home_dir();
      const destinationDir = GLib.build_filenamev([
        homeDir,
        "Videos",
        "ScreenRecord",
        `${year}-${numericMonth} ${month}`,
        `${year}-${numericMonth}-${day} ${weekday}`,
      ]);
      // Ensure the destination directory exists
      const destDir = Gio.File.new_for_path(destinationDir);
      if (!destDir.query_exists(null)) {
        try {
          destDir.make_directory_with_parents(null);
        } catch (e) {
          logError(e, "Failed to create destination directory");
          return;
        }
      }
      this._settings.set_string("destination-dir", destinationDir);

      this._outputFile = GLib.build_filenamev([
        destinationDir,
        `${year}-${numericMonth}-${day}-${hour}:${minute}:${second}.mkv`,
      ]);

      const monitors = Main.layoutManager.monitors;
      if (monitors.length === 0) {
        logError(new Error("No monitors found"), "Cannot start recording");
        return;
      }

      const framerate = this._settings.get_int("framerate");
      const codec = this._settings.get_string("codec");
      const quality = this._settings.get_string("quality");
      const preset = this._settings.get_string("preset");
      const selectedMonitor = this._settings.get_int("selected-monitor");
      const useHwAccel = this._settings.get_boolean("use-hw-accel");
      const hwAccelMethod = this._settings.get_string("hw-accel-method");
      const hwAccelCodec = this._settings.get_string("hw-accel-codec");
      let x, y, width, height;

      if (selectedMonitor === -1) {
        // Record all monitors
        let minX = Infinity,
          minY = Infinity;
        let maxX = -Infinity,
          maxY = -Infinity;
        monitors.forEach((monitor) => {
          minX = Math.min(minX, monitor.x);
          minY = Math.min(minY, monitor.y);
          maxX = Math.max(maxX, monitor.x + monitor.width);
          maxY = Math.max(maxY, monitor.y + monitor.height);
        });
        x = minX;
        y = minY;
        width = maxX - minX;
        height = maxY - minY;
        // Adjust for negative coordinates
        if (x < 0) {
          width += x;
          x = 0;
        }
        if (y < 0) {
          height += y;
          y = 0;
        }
        // Ensure width and height are positive
        width = Math.max(1, width);
        height = Math.max(1, height);
        // Limit width and height to 4096 if hardware acceleration is used

      } else {
        // Record selected monitor
        const monitorIndex = Math.min(selectedMonitor, monitors.length - 1);
        const monitor = monitors[monitorIndex];
        x = monitor.x;
        y = monitor.y;
        width = monitor.width;
        height = monitor.height;

        // Adjust for negative coordinates
        if (x < 0) {
          width += x;
          x = 0;
        }
        if (y < 0) {
          height += y;
          y = 0;
        }
      }

      const command = [
        "ffmpeg",
        "-f",
        "x11grab",
        "-r",
        framerate.toString(),
        "-s",
        `${width}x${height}`,
        "-i",
        `:0.0+${x},${y}`, // This line specifies the capture area
        // Force keyframe every 2 seconds
        "-force_key_frames",
        "expr:gte(t,n_forced*100)",//A new keyframe will be forced every 20 frames.//At 5 fps, 20 frames equate to 4 seconds of video.
        "-f", "matroska",
        // "-threads", "0",  // Use optimal number of threads
        // "-probesize", "42M",
        // "-analyzeduration", "100M",
        // "-thread_queue_size", "1024",
        // "-loglevel", "warning",  // Reduce log output
        // "-stats",
      ];

      if (useHwAccel) {


        
        switch (hwAccelMethod) {
          case "vaapi":
            command.push("-vaapi_device", "/dev/dri/renderD128");
            if (width > 4096 || height > 4096) {
              let scaleFilter = `scale=min(4096\\,iw):min(4096\\,ih):force_original_aspect_ratio=decrease`;
              command.push("-vf", `${scaleFilter},format=nv12,hwupload`);
            } else {
              command.push("-vf", "format=nv12,hwupload");
            }


            if (hwAccelCodec === "h264_vaapi") {
              command.push("-c:v", "h264_vaapi");
            } else {
              command.push("-c:v", "hevc_vaapi");
            }

       
            command.push("-qp", "23"); // Adjusted QP value for better quality
            command.push("-rc_mode", "CQP"); // Constant QP mode
            command.push("-g", "250"); // Keyframe interval
            command.push("-bf", "2"); // Maximum 2 B-frames between I and P frames
            
            break;
          case "nvenc":
            command.push("-hwaccel", "cuda");
            if (hwAccelCodec === "h264_nvenc") {
              command.push("-c:v", "h264_nvenc");
            } else {
              command.push("-c:v", "hevc_nvenc");
            }
        
            command.push("-qp", "23"); // Adjusted QP value for better quality
            command.push("-g", "250"); // Keyframe interval
            command.push("-bf", "2"); // Maximum 2 B-frames between I and P frames
            break;
          default:
            // Fallback to software encoding if the method is not recognized
            log(
              `[ScreenRecorder] Unrecognized hardware acceleration method: ${hwAccelMethod}. Falling back to software encoding.`
            );
            useHwAccel = false;
        }
      }

      if (!useHwAccel) {
        // Software encoding
        command.push("-c:v", codec);
      }
     command.push("-preset", preset);
      command.push("-crf", quality, this._outputFile);
 
      log(`[ScreenRecorder] Executing command: ${command.join(" ")}`);

      // try {
      //   this._proc = Gio.Subprocess.new(
      //     command,
      //     Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
      //   );

      //   this._isRecording = true;
      //   log("[ScreenRecorder] Recording started, _isRecording set to true");
      //   this._icon.icon_name = "media-record-symbolic";
      //   this._icon.set_style("color: #ff0000;"); // Set the icon color to red
      //   this._startStopItem.label.text = _("Stop Recording");
      // } catch (e) {
      //   logError(e, "[ScreenRecorder] Failed to start recording");
      //   Main.notifyError(
      //     _("Screen Recorder"),
      //     _("Failed to start recording. Check the logs for more information.")
      //   );
      // }

      try {
        this._proc = Gio.Subprocess.new(
          command,
          Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
        );
        this._isRecording = true;
        log("[ScreenRecorder] Recording started, _isRecording set to true");
        this._icon.icon_name = "media-record-symbolic";
        this._icon.set_style("color: #ff0000;"); // Set the icon color to red
        this._startStopItem.label.text = _("Stop Recording");

         // Log stdout
    this._logOutput(this._proc.get_stdout_pipe(), "stdout");
    // Log stderr
    this._logOutput(this._proc.get_stderr_pipe(), "stderr");
        // Monitor the subprocess
        this._monitorSubprocess();
      } catch (e) {
        this._handleRecordingError(e);
      }
    }

    _logOutput(pipe, type) {
      let dataStream = Gio.DataInputStream.new(pipe);
      this._readOutput(dataStream, type);
    }
    _readOutput(dataStream, type) {
      dataStream.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, result) => {
        try {
          const [line, length] = stream.read_line_finish(result);
          if (line) {
            const decodedLine = new TextDecoder().decode(line);
            log(`[ScreenRecorder] FFmpeg ${type}: ${decodedLine}`);
            this._readOutput(stream, type);
          }
        } catch (e) {
          logError(e, `[ScreenRecorder] Error reading ${type}`);
        }
      });
    }
    _monitorSubprocess() {
      this._proc.wait_async(null, (proc, result) => {
        try {
          const [, status] = proc.wait_finish(result);
          if (status !== 0) {
            throw new Error(`FFmpeg exited with status ${status}`);
          }
          if (this._isRecording) {
            log("[ScreenRecorder] Recording process ended unexpectedly. Restarting...");
            this._restartRecording();
          }
        } catch (e) {
          this._handleRecordingError(e);
        }
      });
    }

        _handleRecordingError(error) {
          logError(error, "[ScreenRecorder] Recording error");
          this._isRecording = false;
          this._icon.icon_name = "media-record-symbolic";
          this._icon.set_style("");
          this._startStopItem.label.text = _("Start Recording");
          // Main.notifyError(_("Screen Recorder"), _("Recording stopped due to an error. Check the logs for more information."));
        }
    _restartRecording() {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
        if (this._isRecording) {
          log("[ScreenRecorder] Attempting to restart recording");
          this._isRecording = false;
          this._startRecording();
        }
        return GLib.SOURCE_REMOVE;
      });
    }

    destroy() {
      if (this._isRecording) {
        this._stopRecording();
        this._isPaused = true;
      }
      this._screenShieldSignals.forEach((signalId) => {
        Main.screenShield.disconnect(signalId);
      });
      this._screenShieldSignals = [];
      super.destroy();
    }
  }
);

export default class ScreenRecorderExtension extends Extension {
  _updateMonitorCount() {
    const monitorCount = Main.layoutManager.monitors.length;
    this._settings.set_int("monitor-count", monitorCount);

    // // Ensure selected-monitor is within valid range
    // const currentSelected = this._settings.get_int("selected-monitor");
    // if (currentSelected >= monitorCount) {
    //   this._settings.set_int("selected-monitor", -1); // Set to "All Monitors" if current selection is invalid
    // }
  }
  enable() {
    this._settings = this.getSettings(
      "org.gnome.shell.extensions.screen-recorder"
    );
    this._updateMonitorCount();
    this._monitorChangedSignal = Main.layoutManager.connect(
      "monitors-changed",
      this._updateMonitorCount.bind(this)
    );

    this._indicator = new ScreenRecorder(this, this._settings);
    Main.panel.addToStatusArea(this.uuid, this._indicator);

    if (this._settings.get_boolean("auto-record")) {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10000, () => {
        this._indicator._startRecording();
        return GLib.SOURCE_REMOVE;
      });
    }
  }
  disable() {
    log("[ScreenRecorder] Disabling extension");
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }
    this._settings = null;
    this._sessionManager = null;
    this._loginManager = null;
    log("[ScreenRecorder] Extension disabled");
  }
}
