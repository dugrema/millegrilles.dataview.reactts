import {Link} from "react-router-dom";

function WelcomePage() {
    return (
        <>
            <h1>Welcome</h1>
            <Link to='private'>Go private</Link>
        </>
    )
}

export default WelcomePage;
