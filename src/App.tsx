import { addStyles } from "react-mathquill";
import "./App.css";
import MathExpressionList from "./components/MathExpressionList";

addStyles();

function App() {
	return (
		<div className="">
			<MathExpressionList />
		</div>
	);
}

export default App;
