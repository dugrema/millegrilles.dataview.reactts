import {Link} from "react-router-dom";

function WelcomePage() {
    return (
        <>
            <h1>Welcome to data viewer</h1>
            <Link to='private'>Go private</Link>
        </>
    )
}

export default WelcomePage;
