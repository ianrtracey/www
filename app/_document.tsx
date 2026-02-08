import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
    render() {
        return (
            <Html lang="en" >
                <Head>
                    <script defer data-domain="ian.so" src="https://plausible.io/js/script.js"></script>
                </Head>
                <body>
                    <Main />
                    < NextScript />
                </body>
            </Html>
        );
    }
}

export default MyDocument;
