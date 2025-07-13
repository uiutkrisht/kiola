# Aligna – Automated Figma vs Live Web QA

Aligna is a tool that helps you compare your live website against its Figma design, highlighting any mismatches in fonts, colors, spacing, layout, and images.

## Features

- Compare live website with Figma design
- Detect differences in:
  - Font properties (family, size, weight)
  - Colors
  - Spacing and layout
  - Images
- Visual comparison with side-by-side view
- Detailed difference report with severity levels
- Filter differences by type

## Prerequisites

- Node.js 18+ and npm
- A Figma access token
- Public Figma file URL
- Public website URL to compare

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/aligna.git
cd aligna
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory and add your Figma access token:
```
FIGMA_ACCESS_TOKEN=your_token_here
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Enter your Figma file URL and live website URL in the input form
2. Click "Compare" to start the analysis
3. View the results:
   - Side-by-side visual comparison
   - List of differences with details
   - Filter differences by type
   - Severity indicators for each difference

## Tech Stack

- Next.js 13 with App Router
- React 18
- TypeScript
- Tailwind CSS
- Playwright for DOM capture
- Figma API for design extraction

## Development

### Project Structure

```
/aligna
  /app
    /api
      /parse-figma    # Figma design extraction
      /snapshot-dom   # Live website capture
      /compare       # Comparison logic
    /components
      InputForm.tsx   # URL input form
      ResultViewer.tsx # Results display
    page.tsx         # Main page
  /lib
    figmaUtils.ts    # Figma API utilities
    domUtils.ts      # DOM processing utilities
    comparator.ts    # Comparison algorithms
```

### API Endpoints

- `POST /api/parse-figma`: Extract design elements from Figma
- `POST /api/snapshot-dom`: Capture live website DOM and screenshot
- `POST /api/compare`: Compare design elements with live DOM

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 