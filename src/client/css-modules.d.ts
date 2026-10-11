/** Browser-side types for CSS modules. */
declare module '*.module.css' {
  const classes: Readonly<Record<string, string>>
  export default classes
}
