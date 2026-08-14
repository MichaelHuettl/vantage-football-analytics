// Batch OCR using the Vision framework.
// Prints: <path>\t<recognised text with newlines as \n>
import Foundation
import Vision
import AppKit

for path in CommandLine.arguments.dropFirst() {
    guard let img = NSImage(contentsOfFile: path),
          let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
        FileHandle.standardError.write("skip \(path)\n".data(using: .utf8)!)
        continue
    }
    let request = VNRecognizeTextRequest()
    request.recognitionLevel = .accurate
    request.usesLanguageCorrection = true
    request.recognitionLanguages = ["en-US"]

    let handler = VNImageRequestHandler(cgImage: cg, options: [:])
    do {
        try handler.perform([request])
        let lines = (request.results ?? []).compactMap {
            $0.topCandidates(1).first?.string
        }
        let joined = lines.joined(separator: "\\n")
        print("\(path)\t\(joined)")
    } catch {
        FileHandle.standardError.write("fail \(path): \(error)\n".data(using: .utf8)!)
    }
}
