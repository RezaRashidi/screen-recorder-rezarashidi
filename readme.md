# Screen Recorder GNOME Shell Extension

This GNOME Shell extension provides a convenient way to record your screen directly from the top panel. It offers various configuration options and supports both software and hardware-accelerated encoding.

## Features

- Start and stop screen recording from the GNOME top panel
- Record all monitors or a specific monitor
- Configurable framerate, codec, quality, and preset
- Support for hardware acceleration (VAAPI and NVENC)
- Automatic naming of output files with date and time
- Option to open the output directory
- Preferences dialog for easy configuration
- Automatic recording option on startup

## Requirements

- GNOME Shell (version 46)
- FFmpeg

## Installation

1. Clone this repository or download the source code.
2. Copy the entire directory to `~/.local/share/gnome-shell/extensions/`
3. Rename the directory to `screen-recorder@yourusername.gmail.com`
4. Restart the GNOME Shell (Alt+F2, type 'r', press Enter)
5. Enable the extension using GNOME Extensions app or GNOME Tweaks

## Usage

1. Click on the extension icon in the top panel to open the menu.
2. Select "Start Recording" to begin recording.
3. Click "Stop Recording" to end the recording.
4. Use "Preferences" to configure the extension settings.
5. "Open Output Directory" will open the folder containing your recordings.

## Configuration

You can configure the following settings in the Preferences dialog:

- Framerate
- Codec (H.264 or HEVC)
- Quality (CRF value)
- Encoding Preset
- Monitor Selection
- Hardware Acceleration (VAAPI or NVENC)
- Auto-record on startup

## Troubleshooting

If you encounter any issues:

1. Check the GNOME Shell log for error messages related to the extension.
2. Ensure FFmpeg is installed and accessible from the command line.
3. Verify that your system supports the selected hardware acceleration method (if enabled).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the GNU General Public License v2.0 or later.

## Acknowledgements

- GNOME Shell developers
- FFmpeg project