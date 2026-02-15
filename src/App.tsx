import { addStyles } from "react-mathquill";
import Split from "react-split";
import "./App.css";
import DiptychV2 from "./components/DiptychV2";
import MathExpressionList from "./components/MathExpressionList";

addStyles();

function App() {
	return (
		<div className="flex w-full h-[calc(100vh-4rem)]">
			{/* <MathExpressionList /> */}
			{/* <Diptych /> */}
			<Split
				sizes={[50, 50]}
				minSize={100}
				expandToMin={false}
				gutterSize={10}
				gutterAlign="center"
				snapOffset={30}
				dragInterval={1}
				direction="horizontal"
				cursor="col-resize"
				className="split flex flex-row w-full h-full">
				<div className="math-expression-list-pane h-full overflow-auto">
					<MathExpressionList />
				</div>
				<div className="diptych-pane h-full overflow-auto">
					<DiptychV2 file_path="/Users/illusion/dev/Everett/NOTES.md" />
				</div>
			</Split>
		</div>
	);
}

export default App;
