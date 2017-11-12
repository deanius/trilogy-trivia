import React from "react"

const SignIn = ({ title, players }) => {
  let url = document.location.href.replace(/\/\w+$/, "")
  let link = <a href={url}>{url}</a>

  return (
    <div>
      <h3 style={{ float: "right" }}>
        {Object.keys(players).length} Players Joined
      </h3>
      <div style={{ clear: "both", padding: 47, margin: 20 }} className="App">
        <div className="App-header">
          {
            <img
              src="/img/trilobyte.jpg"
              className="App-logo"
              alt="logo"
              style={{ float: "right" }}
            />
          }
          <h2>Introducing, Trilobytes of Trivia!</h2>
          <h1>
            Join Us at <span className="join-link">{link}</span> !
          </h1>
        </div>
      </div>
      {/* TODO we can know how many lurkers too */}
    </div>
  )
}

const RoundView = ({ players, round }) => (
  <div>
    <div className="response-count">
      Question {round.label}
      <br />
      {Math.min(Object.keys(players).length, round.responses.length)}/{Object.keys(players).length}{" "}
      Responses Received
    </div>
    <div style={{ clear: "both", padding: 25 }}>
      <h1>{round.prompt}</h1>
      {round.choices.map((choice, idx) => (
        <div
          key={choice}
          className={
            choice === round.answer && round.revealed ? "correct-answer" : ""
          }
        >
          <div className="live-answer">
            <span className="live-label">{String.fromCharCode(65 + idx)}</span>
            {choice}
          </div>
        </div>
      ))}
      {round.revealed && (
        <div>
          <h3>Links</h3>
          {round.links.map(({ text, href }) => (
            <p key={href}>
              <a href={href}>
                {text}: {href}
              </a>
            </p>
          ))}
        </div>
      )}
    </div>
  </div>
)

export default props => {
  let { title } = props
  return (
    <div>
      <h2 className="game-title">{title}</h2>
      {/* TODO show SignIn before a round's begun,
            RoundView when the round's in progress
     */}
      {props.round ? <RoundView {...props} /> : <SignIn {...props} />}
    </div>
  )
}