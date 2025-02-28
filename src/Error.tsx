export function ErrorPage() {
    return (
        <div className="App">
            <header className="App-header text-slate-300 flex-1 content-center loading">
                <h1 style={{'paddingTop': '1.5rem', 'paddingBottom': '1.7rem'}}>MilleGrilles</h1>
                <p>An error occurred. The page cannot be loaded a this time.</p>
                <button onClick={reload}
                        className='btn bg-indigo-800 hover:bg-indigo-600 active:bg-indigo-500'>
                    Retry
                </button>
                <div style={{height: '20vh'}}></div>
            </header>
        </div>
    )
}

function reload() {
    window.location.reload()
}
