function addLatexToMathJax3()
{
    // Check if MathJax exists and has the required properties
    if (typeof MathJax === 'undefined' || !MathJax?.startup?.document?.math) {
        console.log('MarkDownload PageContext: MathJax not available, skipping LaTeX processing');
        return;
    }

    try {
        console.log('MarkDownload PageContext: Processing MathJax LaTeX');
        for (const math of MathJax.startup.document.math) {
            if (math.typesetRoot && math.math) {
                math.typesetRoot.setAttribute("markdownload-latex", math.math);
            }
        }
        console.log('MarkDownload PageContext: MathJax LaTeX processing completed');
    } catch (error) {
        console.warn('MarkDownload PageContext: Error processing MathJax LaTeX:', error);
    }
}

// Only run if we're in a proper browser context
if (typeof window !== 'undefined') {
    addLatexToMathJax3();
}
