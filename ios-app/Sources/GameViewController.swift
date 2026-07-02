import UIKit
import WebKit

/// Hosts the Yazı Tura web game inside a full-screen WKWebView.
/// All game assets are bundled locally (see the "Web" folder reference),
/// so the app runs fully offline.
final class GameViewController: UIViewController, WKNavigationDelegate {

    private var webView: WKWebView!

    /// Brand background (#0b1020) — matches the web app's theme-color so there
    /// is no white flash before the canvas paints.
    private let brandColor = UIColor(red: 0x0b / 255.0,
                                     green: 0x10 / 255.0,
                                     blue: 0x20 / 255.0,
                                     alpha: 1.0)

    /// Backdrop behind the status bar (top of the game's background gradient,
    /// #0b1020) so it blends seamlessly with the canvas just below.
    private let headerColor = UIColor(red: 0x0b / 255.0,
                                      green: 0x10 / 255.0,
                                      blue: 0x20 / 255.0,
                                      alpha: 1.0)

    override func loadView() {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        // Persist localStorage (the game's save data) across launches.
        config.websiteDataStore = .default()

        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = brandColor
        webView.scrollView.backgroundColor = brandColor

        // The game manages its own touch handling on a full-screen canvas,
        // so disable native scrolling, bouncing and inset adjustment.
        webView.scrollView.bounces = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.maximumZoomScale = 1.0
        webView.scrollView.minimumZoomScale = 1.0

        // Host the web view in a container whose top edge is the status-bar
        // backdrop. Pinning the web view to the safe-area top keeps the game's
        // header below the clock / Wi-Fi / battery instead of under them.
        let root = UIView()
        root.backgroundColor = headerColor
        webView.translatesAutoresizingMaskIntoConstraints = false
        root.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: root.safeAreaLayoutGuide.topAnchor),
            webView.leadingAnchor.constraint(equalTo: root.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: root.trailingAnchor),
            webView.bottomAnchor.constraint(equalTo: root.bottomAnchor)
        ])
        view = root
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = headerColor
        loadGame()
    }

    private func loadGame() {
        guard let indexURL = Bundle.main.url(forResource: "index",
                                             withExtension: "html",
                                             subdirectory: "Web") else {
            assertionFailure("Bundled web game not found")
            return
        }
        // Grant read access to the whole Web directory so game.js, style.css,
        // icons and the manifest all resolve relative to index.html.
        let webRoot = indexURL.deletingLastPathComponent()
        webView.loadFileURL(indexURL, allowingReadAccessTo: webRoot)
    }

    // Keep the system status bar visible (clock, Wi-Fi, battery, cellular).
    // White glyphs read well on the dark backdrop; the web view is pinned below
    // the safe-area top so the game header never sits under the status bar.
    override var prefersStatusBarHidden: Bool { false }
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }
    override var prefersHomeIndicatorAutoHidden: Bool { true }

    // The game is designed portrait-first; lock to portrait.
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask {
        .portrait
    }
}
